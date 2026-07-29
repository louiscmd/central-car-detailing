import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
    select: { id: true, endpoint: true, createdAt: true },
  });

  return NextResponse.json({
    subscriptionCount: subs.length,
    subscriptions: subs.map(s => ({ id: s.id, endpointSnippet: s.endpoint.slice(-30), createdAt: s.createdAt })),
    vapidPublicKeySet: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vapidPrivateKeySet: !!process.env.VAPID_PRIVATE_KEY,
    vapidMailtoSet: !!process.env.VAPID_MAILTO,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const subs = await prisma.pushSubscription.findMany({ where: { userId: session.user.id } });

  if (subs.length === 0) {
    return NextResponse.json({
      error: "No subscriptions found for your account.",
      hint: "The subscribe step may have failed. Try toggling notifications off then on again.",
    }, { status: 404 });
  }

  const mailto = process.env.VAPID_MAILTO;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;

  if (!mailto || !pub || !priv) {
    return NextResponse.json({
      error: "VAPID env vars missing on server.",
      missing: { mailto: !mailto, pub: !pub, priv: !priv },
    }, { status: 500 });
  }

  webpush.setVapidDetails(mailto, pub, priv);

  const payload = JSON.stringify({
    title: body.title ?? "test",
    body: body.body ?? "This is a test notification from SocialPulse.",
    icon: "/icon-192.png",
    url: "/dashboard",
  });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
    )
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  const errors = results
    .filter(r => r.status === "rejected")
    .map(r => {
      const e = (r as PromiseRejectedResult).reason as { statusCode?: number; body?: string; message?: string };
      return { statusCode: e?.statusCode, body: e?.body, message: e?.message };
    });

  // Clean up stale subs
  const stale = errors.filter(e => e.statusCode === 410 || e.statusCode === 404);
  if (stale.length) {
    await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id } });
  }

  return NextResponse.json({ ok: sent > 0, sent, failed: errors.length, errors });
}
