import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = body.title ?? "test";
  const message = body.body ?? "This is a test notification from SocialPulse.";

  const results = await sendPushToUser(session.user.id, {
    title,
    body: message,
    icon: "/icon-192.png",
    url: "/dashboard",
  });

  const sent = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  if (results.length === 0) {
    return NextResponse.json({ error: "No push subscriptions found. Enable notifications first." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, sent, failed });
}
