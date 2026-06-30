import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

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
          const positiveStage = await prisma.pipelineStage.findFirst({
            where: { userId: existing.userId, name: "Positive reply" },
          });
          const LOW_STAGES = ["Contacted", "Positive reply"];
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              messageRead: false,
              facebookPsid: senderPsid,
              ...(positiveStage && LOW_STAGES.includes(existing.stage.name)
                ? { stageId: positiveStage.id }
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
        if (classification.stage === "CONTACTED" || classification.stage === "NOT_INTERESTED") continue;

        const STAGE_NAME: Record<string, string> = {
          CLIENT_WON: "Client won",
          VERBAL_YES: "Verbal yes",
          MEETING_SCHEDULED: "Meeting / call scheduled",
          INTERESTED: "Positive reply",
        };
        const STAGE_SCORE: Record<string, number> = {
          CLIENT_WON: 100, VERBAL_YES: 75, MEETING_SCHEDULED: 60, INTERESTED: 40,
        };

        const senderName = await fetchSenderName(senderPsid);
        const targetStageName = STAGE_NAME[classification.stage] ?? "Positive reply";

        const stage = await prisma.pipelineStage.findFirst({
          where: { name: targetStageName },
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
            instagram: senderPsid,
            source: "FACEBOOK_MESSAGE",
            notes: `Original message:\n"${text}"\n\nClassifier: ${classification.stage} (${Math.round(classification.confidence * 100)}%) — ${classification.reason}`,
            score: STAGE_SCORE[classification.stage] ?? 40,
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

type ClassifierStage = "CLIENT_WON" | "VERBAL_YES" | "MEETING_SCHEDULED" | "INTERESTED" | "NOT_INTERESTED" | "CONTACTED";

interface Classification {
  stage: ClassifierStage;
  confidence: number;
  reason: string;
  businessName?: string | null;
  category?: string | null;
  city?: string | null;
}

async function classifyMessage(text: string): Promise<Classification> {
  const fallback: Classification = { stage: "CONTACTED", confidence: 1, reason: "classifier error" };
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `You are a sales pipeline classifier for a social media content creator who cold-DMs restaurants and cafés in Warsaw, London, and France offering photography, video, and social media management.

Determine the HIGHEST pipeline stage reached. Return the highest — never multiple.

STAGES (highest to lowest):

CLIENT_WON — Payment sent, contract signed, project started, "see you Monday", "let's start".

VERBAL_YES — Clear agreement to work together before payment: "yes let's do it", "we'd like to proceed", "send the contract", "let's begin", "I'm in", "on y va", "zróbmy to".

MEETING_SCHEDULED — Specific call or meeting confirmed (day/time agreed, Calendly sent, "book me in"). Do NOT use if they're only discussing the possibility of a call.

INTERESTED — Any genuine buying signal: asking for pricing, portfolio, examples of work, references, how the service works, packages, next steps, wanting to discuss further. Asking questions about the offer = INTERESTED. Examples: "can you send examples?", "what's your pricing?", "tell me more", "could you send your portfolio?", "prześlij przykłady", "ile kosztuje", "envoyez des exemples".

NOT_INTERESTED — Clear decline: "not interested", "we already have someone", "no thanks", "please stop", "nie jesteśmy zainteresowani", "pas intéressé", "mamy już kogoś".

CONTACTED — No meaningful buying signal: seen, no reply, auto-replies, generic thank-yous, greetings, emoji reactions, "we'll get back to you", "message received", Facebook/Instagram automatic responses, invitations to visit the restaurant.

RULES:
- Read the full message before deciding.
- Negations override keywords: "we are NOT interested" = NOT_INTERESTED.
- Automated or generic thank-you messages = CONTACTED, never INTERESTED.
- If uncertain between CONTACTED and INTERESTED, choose CONTACTED.

Message: "${text}"

Reply ONLY with this JSON (no markdown):
{"stage":"CONTACTED","confidence":0.95,"reason":"one sentence","businessName":"name or null","category":"restaurant/cafe/bar/gym/other or null","city":"city or null"}`,
      }],
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return fallback;
    return JSON.parse(m[0]) as Classification;
  } catch {
    return fallback;
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
