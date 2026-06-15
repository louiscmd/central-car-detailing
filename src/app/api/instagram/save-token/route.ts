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

  // Get Facebook Pages + connected Instagram Business accounts
  const accountsRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`
  );

  if (!accountsRes.ok) {
    return NextResponse.json({ error: "Failed to fetch Facebook pages" }, { status: 400 });
  }

  const accountsData = await accountsRes.json() as {
    data: { id: string; name: string; access_token: string; instagram_business_account?: { id: string } }[]
  };

  const page = accountsData.data?.find(p => p.instagram_business_account);
  if (!page) {
    return NextResponse.json({ error: "No Instagram Business account found. Make sure the Instagram account is connected to a Facebook Page." }, { status: 400 });
  }

  const igAccountId = page.instagram_business_account!.id;
  const pageAccessToken = page.access_token;

  // Store token data as JSON in accessToken field
  const tokenData = JSON.stringify({ userToken: token, pageToken: pageAccessToken, igAccountId });

  const account = await prisma.socialAccount.findFirst({
    where: { id: parsed.accountId, client: { userId: parsed.userId } },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  await prisma.socialAccount.update({
    where: { id: parsed.accountId },
    data: {
      accessToken: tokenData,
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
  });

  return NextResponse.json({ redirect: `/clients/${account.clientId}?connected=instagram` });
}
