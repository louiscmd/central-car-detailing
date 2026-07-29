import webpush from "web-push";
import { prisma } from "@/lib/prisma";

function initVapid() {
  const mailto = process.env.VAPID_MAILTO;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!mailto || !pub || !priv) throw new Error("VAPID env vars not set");
  webpush.setVapidDetails(mailto, pub, priv);
}

export interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  initVapid();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
    )
  );
  // Remove expired subscriptions (410 Gone)
  const stale: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) stale.push(subs[i].endpoint);
    }
  });
  if (stale.length) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } });
  }
  return results;
}
