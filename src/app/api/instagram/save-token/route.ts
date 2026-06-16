import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { token, state } = await req.json() as { token: string; state: string };

  if (!token || !state) {
    return NextResponse.json({ error: "Missing token or state" }, { status: 400 });
  }

  let parsed: { accountId: string; userId: string };
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const account = await prisma.socialAccount.findFirst({
    where: { id: parsed.accountId, client: { userId: parsed.userId } },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // ── Try method 1: Facebook Pages → connected Instagram Business account ──
  let igAccountId: string | null = null;
  let pageAccessToken: string | null = null;

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`
  );
  if (pagesRes.ok) {
    const pagesData = await pagesRes.json() as {
      data: { id: string; access_token: string; instagram_business_account?: { id: string } }[]
    };
    const page = pagesData.data?.find(p => p.instagram_business_account);
    if (page) {
      igAccountId = page.instagram_business_account!.id;
      pageAccessToken = page.access_token;
    }
  }

  // ── Try method 2: Instagram account directly linked to Facebook profile ──
  if (!igAccountId) {
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=instagram_business_account&access_token=${token}`
    );
    if (meRes.ok) {
      const meData = await meRes.json() as { instagram_business_account?: { id: string } };
      if (meData.instagram_business_account?.id) {
        igAccountId = meData.instagram_business_account.id;
        pageAccessToken = token; // use userToken as pageToken in this case
      }
    }
  }

  // ── Store whatever we found ──
  // Even without a Business account we save the userToken so the scraper
  // can retry discovery later. igAccountId/pageToken may be null.
  const tokenData = JSON.stringify({
    userToken: token,
    pageToken: pageAccessToken ?? token,
    igAccountId,
  });

  await prisma.socialAccount.update({
    where: { id: parsed.accountId },
    data: {
      accessToken: tokenData,
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
  });

  if (!igAccountId) {
    // Token saved, but no Business account found — redirect with a warning
    return NextResponse.json({
      redirect: `/clients/${account.clientId}?connected=instagram&warn=no_business_account`,
    });
  }

  return NextResponse.json({ redirect: `/clients/${account.clientId}?connected=instagram` });
}
