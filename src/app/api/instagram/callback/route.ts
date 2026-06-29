import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/clients?error=${encodeURIComponent(errorDesc ?? error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/clients?error=Missing+code+or+state`
    );
  }

  let parsed: { accountId: string; userId: string };
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/clients?error=Invalid+state`
    );
  }

  const account = await prisma.socialAccount.findFirst({
    where: { id: parsed.accountId, client: { userId: parsed.userId } },
  });
  if (!account) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/clients?error=Account+not+found`
    );
  }

  // Exchange code for short-lived token
  const appId = process.env.INSTAGRAM_APP_ID!;
  const appSecret = process.env.INSTAGRAM_APP_SECRET!;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;

  const tokenRes = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } };
  if (!tokenData.access_token) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/clients?error=${encodeURIComponent(tokenData.error?.message ?? "Token exchange failed")}`
    );
  }

  const shortToken = tokenData.access_token;

  // Exchange for long-lived token
  const llRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
  );
  const llData = await llRes.json() as { access_token?: string; expires_in?: number };
  const token = llData.access_token ?? shortToken;

  // Method 1: Facebook Pages → instagram_business_account
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

    // Also check connected_instagram_account on each page
    if (!igAccountId && pagesData.data?.length > 0) {
      for (const pg of pagesData.data) {
        const pgRes = await fetch(
          `https://graph.facebook.com/v21.0/${pg.id}?fields=instagram_business_account,connected_instagram_account&access_token=${pg.access_token}`
        );
        if (pgRes.ok) {
          const pgData = await pgRes.json() as { instagram_business_account?: { id: string }; connected_instagram_account?: { id: string } };
          const foundId = pgData.instagram_business_account?.id ?? pgData.connected_instagram_account?.id;
          if (foundId) {
            igAccountId = foundId;
            pageAccessToken = pg.access_token;
            break;
          }
        }
      }
    }
  }

  // Method 2: Instagram directly linked to Facebook profile
  if (!igAccountId) {
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=instagram_business_account&access_token=${token}`
    );
    if (meRes.ok) {
      const meData = await meRes.json() as { instagram_business_account?: { id: string } };
      if (meData.instagram_business_account?.id) {
        igAccountId = meData.instagram_business_account.id;
        pageAccessToken = token;
      }
    }
  }

  const storedToken = JSON.stringify({
    userToken: token,
    pageToken: pageAccessToken ?? token,
    igAccountId,
  });

  await prisma.socialAccount.update({
    where: { id: parsed.accountId },
    data: {
      accessToken: storedToken,
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });

  if (!igAccountId) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/clients/${account.clientId}?connected=instagram&warn=no_business_account`
    );
  }

  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL}/clients/${account.clientId}?connected=instagram`
  );
}
