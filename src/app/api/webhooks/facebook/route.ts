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

// ─── Incoming webhook events ─────────────────────────────────────────────────

export async function POST(req: Request) {
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
      message?: { mid: string; text?: string; is_echo?: boolean };
      read?: { watermark: number };
    }[];
  }[];
}

// ─── Processing ───────────────────────────────────────────────────────────────

async function processEvents(payload: FacebookWebhookPayload) {
  for (const entry of payload.entry) {
    const pageId = entry.id;

    for (const event of entry.messaging ?? []) {
      const senderPsid = event.sender.id;

      // ── Read receipt ──────────────────────────────────────────────────────
      if (event.read) {
        // The sender is the person who read our message (the lead).
        // Skip if this is the page itself reading its own sent messages.
        if (senderPsid === pageId) continue;

        // Look up lead by facebookPsid or (legacy) instagram field
        const lead = await prisma.lead.findFirst({
          where: {
            OR: [
              { facebookPsid: senderPsid },
              { instagram: senderPsid },          // backward compat
            ],
            source: "FACEBOOK_MESSAGE",
          },
        });

        if (lead) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { messageRead: true, facebookPsid: senderPsid },
          });
        }
        continue;
      }

      // ── Inbound message (they replied) ────────────────────────────────────
      if (event.message && !event.message.is_echo) {
        const text = event.message.text;
        if (!text) continue;

        // If the lead has read=true and now replied, clear the read flag
        // and move them to "Replied" stage
        const existing = await prisma.lead.findFirst({
          where: {
            OR: [
              { facebookPsid: senderPsid },
              { instagram: senderPsid },
            ],
            source: "FACEBOOK_MESSAGE",
          },
          include: { stage: true },
        });

        if (existing) {
          const repliedStage = await prisma.pipelineStage.findFirst({
            where: { userId: existing.userId, name: "Replied" },
          });
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              messageRead: false,           // they replied — remove from Seen column
              facebookPsid: senderPsid,     // ensure PSID is stored
              ...(repliedStage && existing.stage.name !== "Replied"
                ? { stageId: repliedStage.id }
                : {}),
            },
          });
          await prisma.leadActivity.create({
            data: {
              leadId: existing.id,
              type: "DM_SENT",
              note: `Facebook reply: "${text.slice(0, 200)}"`,
            },
          });
          continue;
        }

        // New lead from an inbound message — classify with Claude
        const classification = await classifyMessage(text);
        if (!classification.interested) continue;

        const senderName = await fetchSenderName(senderPsid);

        const stage = await prisma.pipelineStage.findFirst({
          where: { name: "Replied" },
          orderBy: { createdAt: "asc" },
        });
        if (!stage) continue;

        const lead = await prisma.lead.create({
          data: {
            userId: stage.userId,
            stageId: stage.id,
            businessName: classification.businessName ?? senderName ?? "Facebook Lead",
            category: classification.category ?? undefined,
            city: classification.city ?? undefined,
            contactName: senderName ?? undefined,
            facebookPsid: senderPsid,
            instagram: senderPsid,          // legacy field for dedup compat
            source: "FACEBOOK_MESSAGE",
            notes: `Original message:\n"${text}"`,
            score: 40,
          },
        });

        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: "CREATED",
            note: `Auto-added from Facebook message: "${text.slice(0, 150)}"`,
          },
        });

        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 1);
        await prisma.followUp.create({
          data: { leadId: lead.id, dueDate: followUpDate, priority: "HIGH", note: "Reply to their Facebook message" },
        });
      }
    }
  }
}

// ─── Claude classification ────────────────────────────────────────────────────

interface Classification {
  interested: boolean;
  businessName?: string;
  category?: string;
  city?: string;
}

async function classifyMessage(text: string): Promise<Classification> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `You are classifying inbound Facebook messages for a Warsaw-based social media freelancer who does cold DM outreach to restaurants and cafes, offering content creation (photos, videos, reels, posts).

Classify this reply as interested=true ONLY if it contains a genuine engagement signal:
- Asking for examples of work, portfolio, or previous clients ("prześlij przykłady", "pokaż portfolio", "show me your work", "send examples", "what have you done for others")
- Asking about pricing, packages, or cost ("ile kosztuje", "how much", "cennik", "combien")
- Wanting to meet, call, or continue the conversation ("spotykamy się", "zadzwoń", "let's talk", "rendez-vous")
- Asking how the service works or what's included ("jak to działa", "co oferujesz", "tell me more", "what does it include")
- Explicit statement of interest in working together ("jesteśmy zainteresowani", "I'm interested", "sounds interesting")
- Asking for a proposal or offer ("prześlij ofertę", "send me a quote")

Classify as interested=false if the message is:
- An auto-reply or chatbot response ("odpowiedź automatyczna", "we'll get back to you", "we've received your message", "merci de nous avoir contacté")
- A generic polite thank-you with no specific question ("dziękujemy za wiadomość", "merci pour votre message", "thank you for reaching out", "dzięki!")
- A brief positive reaction without follow-through ("super!", "ok!", "miło słyszeć")
- An invitation to visit their physical location (not relevant to the service offer)
- A message that doesn't engage with the social media offer at all

Message: "${text}"
Reply ONLY with JSON: {"interested":true/false,"businessName":"name or null","category":"restaurant/cafe/gym/other/null","city":"city or null"}`,
      }],
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return { interested: false };
    return JSON.parse(m[0]) as Classification;
  } catch {
    return { interested: false };
  }
}

// ─── Fetch sender name ────────────────────────────────────────────────────────

async function fetchSenderName(psid: string): Promise<string | null> {
  try {
    const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!token) return null;
    const res = await fetch(`https://graph.facebook.com/v21.0/${psid}?fields=name&access_token=${token}`);
    if (!res.ok) return null;
    const data = await res.json() as { name?: string };
    return data.name ?? null;
  } catch {
    return null;
  }
}
