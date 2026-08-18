import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

const UNREAD_THRESHOLD_HOURS = 2;

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - UNREAD_THRESHOLD_HOURS * 60 * 60 * 1000);

  // Find unread messages sent by clients to managers, older than threshold
  const unread = await prisma.chatMessage.findMany({
    where: {
      read: false,
      createdAt: { lte: cutoff },
      sender: { role: "CLIENT" },
    },
    select: {
      clientId: true,
      client: {
        select: { userId: true, name: true },
      },
    },
    distinct: ["clientId"],
  });

  const results = await Promise.allSettled(
    unread
      .filter(msg => msg.client != null)
      .map(msg =>
        sendPushToUser(msg.client!.userId, {
          title: `Unread message from ${msg.client!.name}`,
          body: `You have unread messages waiting for over ${UNREAD_THRESHOLD_HOURS} hours.`,
          icon: "/icon-192.png",
          url: `/clients/${msg.clientId}/chat`,
        })
      )
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, usersNotified: sent, unreadThreads: unread.length });
}
