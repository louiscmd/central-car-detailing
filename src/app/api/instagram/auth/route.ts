import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "INSTAGRAM_APP_ID not configured" }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/callback`;
  const state = Buffer.from(JSON.stringify({ accountId, userId: session.user.id })).toString("base64");

  const url = new URL("https://api.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "user_profile,user_media");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
