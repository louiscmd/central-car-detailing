import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user?.id || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { target, title, body, url } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  let userIds: string[] = [];

  if (target === "all") {
    // Everyone with a push subscription except the admin themselves
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { not: session.user.id } },
      select: { userId: true },
      distinct: ["userId"],
    });
    userIds = subs.map(s => s.userId);
  } else if (target === "clients") {
    // Only CLIENT role users
    const subs = await prisma.pushSubscription.findMany({
      where: { user: { role: "CLIENT" } },
      select: { userId: true },
      distinct: ["userId"],
    });
    userIds = subs.map(s => s.userId);
  } else if (target?.startsWith("user:")) {
    // Specific user by id
    userIds = [target.replace("user:", "")];
  } else {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  if (userIds.length === 0) {
    return NextResponse.json({ error: "No subscribed users found for that target." }, { status: 404 });
  }

  const results = await Promise.allSettled(
    userIds.map(uid =>
      sendPushToUser(uid, {
        title: title.trim(),
        body: body?.trim() || undefined,
        icon: "/icon-192.png",
        url: url || "/dashboard",
      })
    )
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  return NextResponse.json({ ok: true, sent, failed, total: userIds.length });
}
