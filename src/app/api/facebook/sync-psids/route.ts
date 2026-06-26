import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface FbParticipant { id: string; name: string; }
interface FbConversation {
  id: string;
  participants: { data: FbParticipant[] };
}
interface FbConversationsResponse {
  data: FbConversation[];
  paging?: { cursors?: { after?: string }; next?: string };
}

/** Normalise a display name for fuzzy matching. */
function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Loose similarity: true if one string contains the other after normalisation. */
function looslyMatches(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageToken) {
    return NextResponse.json(
      { error: "FACEBOOK_PAGE_ACCESS_TOKEN is not set. Add it to your Vercel environment variables." },
      { status: 400 }
    );
  }

  // Get page ID from the token
  const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${pageToken}`);
  if (!meRes.ok) {
    const err = await meRes.json() as { error?: { message?: string } };
    return NextResponse.json({ error: `Facebook API error: ${err.error?.message ?? meRes.status}` }, { status: 400 });
  }
  const me = await meRes.json() as { id: string; name: string };
  const pageId = me.id;

  // Fetch all conversations (paginated)
  const allConvos: FbConversation[] = [];
  let url: string | null =
    `https://graph.facebook.com/v21.0/${pageId}/conversations?fields=participants&limit=200&access_token=${pageToken}`;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json() as FbConversationsResponse;
    allConvos.push(...(data.data ?? []));
    url = data.paging?.next ?? null;
  }

  // Build a map: PSID → display name (exclude our own page)
  const psidMap: Map<string, string> = new Map();
  for (const convo of allConvos) {
    for (const p of convo.participants?.data ?? []) {
      if (p.id !== pageId) psidMap.set(p.id, p.name);
    }
  }

  // Load all Facebook DM leads for this user that don't yet have a PSID
  const leads = await prisma.lead.findMany({
    where: { userId: session.user.id, source: "FACEBOOK_MESSAGE" },
    select: { id: true, businessName: true, facebookPsid: true },
  });

  let matched = 0;
  let alreadyHad = 0;

  for (const lead of leads) {
    if (lead.facebookPsid) { alreadyHad++; continue; }

    // Try to find a matching PSID by name
    let foundPsid: string | null = null;
    for (const [psid, name] of psidMap) {
      if (looslyMatches(lead.businessName, name)) {
        foundPsid = psid;
        break;
      }
    }

    if (foundPsid) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { facebookPsid: foundPsid },
      });
      matched++;
    }
  }

  return NextResponse.json({
    ok: true,
    pageName: me.name,
    conversations: allConvos.length,
    leads: leads.length,
    matched,
    alreadyHad,
    unmatched: leads.length - matched - alreadyHad,
  });
}
