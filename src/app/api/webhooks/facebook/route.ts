import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Facebook webhook verification handshake ────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ─── Incoming message events ─────────────────────────────────────────────────

export async function POST(req: Request) {
  // Verify signature
  const rawBody = await req.text();
  const sig = req.headers.get("x-hub-signature-256") ?? "";
  const expected = "sha256=" + createHmac("sha256", process.env.INSTAGRAM_APP_SECRET ?? "").update(rawBody).digest("hex");
  if (sig !== expected) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: FacebookWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  if (payload.object !== "page") {
    return NextResponse.json({ ok: true });
  }

  // Process each messaging event in background (don't block Facebook's 5s timeout)
  void processEvents(payload);

  return NextResponse.json({ ok: true });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FacebookWebhookPayload {
  object: string;
  entry: {
    id: string;
    time: number;
    messaging?: {
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: { mid: string; text?: string };
    }[];
  }[];
}

// ─── Processing logic ─────────────────────────────────────────────────────────

async function processEvents(payload: FacebookWebhookPayload) {
  for (const entry of payload.entry) {
    for (const event of entry.messaging ?? []) {
      const text = event.message?.text;
      if (!text) continue; // skip non-text events (attachments, etc.)

      const senderPsid = event.sender.id;

      // Ignore messages the page itself sent
      if (senderPsid === entry.id) continue;

      // Avoid duplicate processing — check if lead with this PSID already exists
      const existing = await prisma.lead.findFirst({
        where: { instagram: senderPsid, source: "FACEBOOK_MESSAGE" },
      });
      if (existing) {
        // Add the message as an activity on the existing lead instead
        await prisma.leadActivity.create({
          data: {
            leadId: existing.id,
            type: "DM_SENT",
            note: `New Facebook message: "${text.slice(0, 200)}"`,
          },
        });
        continue;
      }

      // Classify with Claude
      const classification = await classifyMessage(text);
      if (!classification.interested) continue;

      // Fetch sender's Facebook name
      const senderName = await fetchSenderName(senderPsid);

      // Find the "Replied" stage for the first user (or any user — stages are per-user)
      const stage = await prisma.pipelineStage.findFirst({
        where: { name: "Replied" },
        orderBy: { createdAt: "asc" },
      });
      if (!stage) continue;

      // Get the userId from the stage (all stages belong to a user)
      const userId = stage.userId;

      // Create lead
      const lead = await prisma.lead.create({
        data: {
          userId,
          stageId: stage.id,
          businessName: classification.businessName ?? senderName ?? "Facebook Lead",
          category: classification.category ?? undefined,
          city: classification.city ?? undefined,
          contactName: senderName ?? undefined,
          instagram: senderPsid, // store PSID here to detect duplicates
          source: "FACEBOOK_MESSAGE",
          notes: `Original message:\n"${text}"`,
          score: 40,
        },
      });

      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "CREATED",
          note: `Auto-added from Facebook message: "${text.slice(0, 150)}"`,
        },
      });

      // Auto follow-up in 1 day
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 1);
      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          dueDate: followUpDate,
          priority: "HIGH",
          note: "Reply to their Facebook message",
        },
      });

      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "FOLLOW_UP_SCHEDULED",
          note: "Auto-scheduled: Reply to their Facebook message",
        },
      });
    }
  }
}

// ─── Claude classification ────────────────────────────────────────────────────

interface Classification {
  interested: boolean;
  businessName?: string;
  category?: string;
  city?: string;
  reason?: string;
}

async function classifyMessage(text: string): Promise<Classification> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `You are helping a Warsaw-based social media marketing agency classify incoming Facebook messages.

Determine if this message is from someone potentially interested in buying social media marketing services (Instagram management, content creation, social media strategy, etc.).

Message: "${text}"

Reply with ONLY a JSON object in this exact format:
{
  "interested": true or false,
  "reason": "one sentence why",
  "businessName": "if mentioned, otherwise null",
  "category": "one of: restaurant, cafe, pizzeria, kebab, hotel, barbershop, hair_salon, gym, dental, real_estate, car_dealer, marketing, other — or null if unknown",
  "city": "city name if mentioned, otherwise null"
}

Mark as interested=true if the message shows ANY of:
- Asking about social media services, pricing, packages
- Asking how to grow their Instagram/Facebook
- Saying they have a business and want more followers/customers
- Asking about collaboration or partnership for marketing
- Expressing interest in online presence or branding

Mark as interested=false if it's:
- A personal message unrelated to business
- Spam or promotional content from another agency
- A complaint or customer service inquiry
- Just a greeting with no business context`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { interested: false };
    return JSON.parse(jsonMatch[0]) as Classification;
  } catch {
    return { interested: false };
  }
}

// ─── Fetch sender name from Graph API ────────────────────────────────────────

async function fetchSenderName(psid: string): Promise<string | null> {
  try {
    const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!token) return null;
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${psid}?fields=name&access_token=${token}`
    );
    if (!res.ok) return null;
    const data = await res.json() as { name?: string };
    return data.name ?? null;
  } catch {
    return null;
  }
}
