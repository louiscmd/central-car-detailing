import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXTAUTH_URL ?? "";

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/clients?error=instagram_auth_failed`);
  }

  let state: { accountId: string; userId: string };
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64").toString());
  } catch {
    return NextResponse.redirect(`${appUrl}/clients?error=instagram_auth_failed`);
  }

  const appId = process.env.INSTAGRAM_APP_ID!;
  const appSecret = process.env.INSTAGRAM_APP_SECRET!;
  const redirectUri = `${appUrl}/api/instagram/callback`;

  // Exchange code for short-lived token
  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/clients?error=instagram_token_failed`);
  }

  const { access_token: shortToken, user_id } = await tokenRes.json() as { access_token: string; user_id: string };

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=${appId}&client_secret=${appSecret}&access_token=${shortToken}`
  );

  let finalToken = shortToken;
  let expiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days default

  if (longRes.ok) {
    const { access_token, expires_in } = await longRes.json() as { access_token: string; expires_in: number };
    finalToken = access_token;
    expiry = new Date(Date.now() + expires_in * 1000);
  }

  // Verify account belongs to this user and update token
  const account = await prisma.socialAccount.findFirst({
    where: { id: state.accountId, client: { userId: state.userId } },
  });

  if (!account) {
    return NextResponse.redirect(`${appUrl}/clients?error=account_not_found`);
  }

  await prisma.socialAccount.update({
    where: { id: state.accountId },
    data: { accessToken: finalToken, tokenExpiry: expiry },
  });

  const clientId = account.clientId;
  return NextResponse.redirect(`${appUrl}/clients/${clientId}?connected=instagram`);
}
