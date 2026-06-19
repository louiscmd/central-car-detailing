import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Debug endpoint — shows exactly what tokens/IDs are stored and tests Business Discovery
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") ?? "zamigo_wilanow";

  // Find any connected Instagram account for this user
  const account = await prisma.socialAccount.findFirst({
    where: {
      platform: "INSTAGRAM",
      accessToken: { not: null },
      client: { userId: session.user.id },
    },
    include: { client: true },
  });

  if (!account) {
    return NextResponse.json({ error: "No connected Instagram account found" });
  }

  let parsed: { userToken?: string; pageToken?: string; igAccountId?: string } = {};
  try { parsed = JSON.parse(account.accessToken!); } catch { /* plain token */ }

  const userToken = parsed.userToken ?? account.accessToken!;
  const pageToken = parsed.pageToken ?? userToken;
  const storedIgId = parsed.igAccountId ?? null;

  // Test 1: me/accounts
  const meAccountsRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account&access_token=${userToken}`
  );
  const meAccounts = await meAccountsRes.json();

  // Test 2: me?fields=instagram_business_account
  const meRes = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name,instagram_business_account&access_token=${userToken}`
  );
  const meData = await meRes.json();

  // Find igAccountId from either source
  let igAccountId = storedIgId;
  let activePageToken = pageToken;

  if (!igAccountId) {
    const page = meAccounts.data?.find((p: { instagram_business_account?: { id: string } }) => p.instagram_business_account);
    if (page) {
      igAccountId = page.instagram_business_account.id;
      // Get page token
      const ptRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=access_token&access_token=${userToken}`);
      const ptData = await ptRes.json();
      activePageToken = ptData.access_token ?? pageToken;
    }
  }

  if (!igAccountId && meData.instagram_business_account?.id) {
    igAccountId = meData.instagram_business_account.id;
  }

  // Test 3: Business Discovery (if we have an igAccountId)
  let discoveryResult = null;
  if (igAccountId) {
    const fields = "business_discovery.fields(followers_count,username,name)";
    const drRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}?fields=${encodeURIComponent(fields)}&username=${encodeURIComponent(username)}&access_token=${activePageToken}`
    );
    discoveryResult = await drRes.json();
  }

  return NextResponse.json({
    account: {
      id: account.id,
      username: account.username,
      client: account.client.name,
    },
    stored: {
      hasUserToken: !!parsed.userToken,
      hasPageToken: !!parsed.pageToken,
      igAccountId: storedIgId,
    },
    meAccounts: meAccounts,
    meDirect: meData,
    resolvedIgAccountId: igAccountId,
    businessDiscoveryFor: username,
    discoveryResult,
  });
}
