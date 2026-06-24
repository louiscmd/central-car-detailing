import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PAGE_ID = "61555244191457";
const FB_API = "https://graph.facebook.com/v21.0";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "No token" }, { status: 500 });

  // 1. Check token info
  const tokenInfoRes = await fetch(`${FB_API}/me?access_token=${token}&fields=id,name`);
  const tokenInfo = await tokenInfoRes.json();

  // 2. Check token permissions
  const permsRes = await fetch(`${FB_API}/me/permissions?access_token=${token}`);
  const perms = await permsRes.json();

  // 3. Try conversations endpoint
  const convsRes = await fetch(
    `${FB_API}/${PAGE_ID}/conversations?fields=participants&limit=5&access_token=${token}`
  );
  const convs = await convsRes.json();

  // 4. Try inbox endpoint
  const inboxRes = await fetch(
    `${FB_API}/${PAGE_ID}/conversations?folder=inbox&fields=participants&limit=5&access_token=${token}`
  );
  const inbox = await inboxRes.json();

  return NextResponse.json({
    token_identity: tokenInfo,
    permissions: perms,
    conversations_api: convs,
    inbox_api: inbox,
  });
}
