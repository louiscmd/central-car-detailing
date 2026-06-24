import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGE_ID = "61555244191457";
const FB_API = "https://graph.facebook.com/v21.0";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FbMessage {
  id: string;
  message?: string;
  from?: { id: string; name?: string; email?: string };
  created_time: string;
}

interface FbConversation {
  id: string;
  participants?: { data: { id: string; name?: string; email?: string }[] };
}

interface Classification {
  stage: "skip" | "contacted" | "replied";
  businessName?: string;
  category?: string;
  city?: string;
  reason?: string;
  notes?: string;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "FACEBOOK_PAGE_ACCESS_TOKEN not configured" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 80), 200);
  const dryRun = searchParams.get("dry") === "1";

  // Ensure pipeline stages exist for this user
  const stages = await prisma.pipelineStage.findMany({ where: { userId: session.user.id } });
  const contactedStage = stages.find(s => s.name === "Contacted");
  const repliedStage = stages.find(s => s.name === "Replied");

  if (!contactedStage || !repliedStage) {
    return NextResponse.json({
      error: "Pipeline stages not found. Open the Deal Tracker page first so stages are initialised, then retry.",
    }, { status: 400 });
  }

  // Fetch conversations
  const conversations = await fetchConversations(token, limit);
  const results: {
    added: number; skipped: number; errors: number;
    leads: { name: string; stage: string; reason: string }[];
  } = { added: 0, skipped: 0, errors: 0, leads: [] };

  for (const conv of conversations) {
    try {
      const otherParticipant = conv.participants?.data?.find(p => p.id !== PAGE_ID);
      if (!otherParticipant) { results.skipped++; continue; }

      const psid = otherParticipant.id;

      // Dedup — skip if already in tracker
      const existing = await prisma.lead.findFirst({
        where: { instagram: psid, userId: session.user.id },
        select: { id: true },
      });
      if (existing) { results.skipped++; continue; }

      // Fetch full message thread
      const messages = await fetchMessages(conv.id, token);
      if (messages.length === 0) { results.skipped++; continue; }

      // Classify with Claude
      const classification = await classifyConversation(messages, otherParticipant.name);

      if (classification.stage === "skip") { results.skipped++; continue; }

      const stageRow = classification.stage === "replied" ? repliedStage : contactedStage;

      if (!dryRun) {
        const lead = await prisma.lead.create({
          data: {
            userId: session.user.id,
            stageId: stageRow.id,
            businessName: classification.businessName ?? otherParticipant.name ?? "Unknown",
            category: classification.category ?? "restaurant",
            city: classification.city ?? undefined,
            contactName: otherParticipant.name ?? undefined,
            instagram: psid,
            source: "FACEBOOK_MESSAGE",
            notes: classification.notes
              ? `${classification.notes}\n\nImported via bulk Facebook scan.`
              : "Imported via bulk Facebook scan.",
            score: classification.stage === "replied" ? 50 : 25,
          },
        });

        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: "CREATED",
            note: `Bulk import — ${classification.stage}. ${classification.reason ?? ""}`,
          },
        });

        if (classification.stage === "replied") {
          const due = new Date();
          due.setDate(due.getDate() + 1);
          await prisma.followUp.create({
            data: {
              leadId: lead.id,
              dueDate: due,
              priority: "HIGH",
              note: "Follow up on their interest",
            },
          });
        }
      }

      results.added++;
      results.leads.push({
        name: classification.businessName ?? otherParticipant.name ?? "Unknown",
        stage: classification.stage,
        reason: classification.reason ?? "",
      });
    } catch (err) {
      console.error("Error processing conversation:", err);
      results.errors++;
    }
  }

  return NextResponse.json({
    ...results,
    total_conversations_checked: conversations.length,
    dry_run: dryRun,
  });
}

// ─── Facebook API helpers ─────────────────────────────────────────────────────

async function fetchConversations(token: string, limit: number): Promise<FbConversation[]> {
  const conversations: FbConversation[] = [];
  let url: string | null =
    `${FB_API}/${PAGE_ID}/conversations?fields=participants&limit=100&access_token=${token}`;

  while (url && conversations.length < limit) {
    const res = await fetch(url);
    const data = await res.json() as { data?: FbConversation[]; paging?: { next?: string } };
    if (data.data) conversations.push(...data.data);
    url = data.paging?.next ?? null;
  }

  return conversations.slice(0, limit);
}

async function fetchMessages(convId: string, token: string): Promise<FbMessage[]> {
  const url =
    `${FB_API}/${convId}?fields=messages.limit(50){id,message,from,created_time}&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json() as { messages?: { data?: FbMessage[] } };
  const msgs = data.messages?.data ?? [];
  // Facebook returns newest-first; reverse for chronological order
  return [...msgs].reverse();
}

// ─── Claude classification ────────────────────────────────────────────────────

async function classifyConversation(
  messages: FbMessage[],
  participantName?: string,
): Promise<Classification> {
  const formatted = messages
    .map(m => {
      const speaker = m.from?.id === PAGE_ID ? "US (agency)" : `THEM (${m.from?.name ?? participantName ?? "contact"})`;
      const text = m.message ?? "(image / attachment)";
      const time = m.created_time.slice(0, 10);
      return `[${time}] ${speaker}: ${text}`;
    })
    .join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are helping a Warsaw-based social media marketing agency sort their Facebook outreach.

Read this full conversation and classify it:

CONVERSATION:
${formatted}

Determine:
1. Is the other party a restaurant, café, pizzeria, bar, food business, or similar? If not → stage = "skip"
2. What stage?
   • "skip" — not a food business, or the contact rejected / ignored us completely
   • "contacted" — we reached out, they either didn't reply or gave a neutral/non-committal answer (e.g. "ok", "noted", read but no reply)
   • "replied" — they showed genuine interest: asked for pricing, asked for examples/portfolio, said "sure tell me more", "send me details", "sounds interesting", or similar positive engagement

Reply ONLY with valid JSON:
{
  "stage": "skip" | "contacted" | "replied",
  "businessName": "restaurant or business name if identifiable, else null",
  "category": "restaurant" | "cafe" | "pizzeria" | "kebab" | "hotel" | "bar" | "other",
  "city": "city name if mentioned, else null",
  "reason": "one sentence explanation of the classification",
  "notes": "2–3 sentence summary of the conversation"
}`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { stage: "skip" };
    return JSON.parse(match[0]) as Classification;
  } catch {
    return { stage: "skip" };
  }
}
