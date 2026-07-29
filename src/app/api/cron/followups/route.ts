import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const followUps = await prisma.followUp.findMany({
    where: {
      completed: false,
      dueDate: { gte: todayStart, lte: todayEnd },
    },
    include: {
      lead: {
        select: {
          businessName: true,
          userId: true,
        },
      },
    },
  });

  // Group by user to send one push per user with a count
  const byUser = new Map<string, { userId: string; leads: string[] }>();
  for (const f of followUps) {
    const uid = f.lead.userId;
    if (!byUser.has(uid)) byUser.set(uid, { userId: uid, leads: [] });
    byUser.get(uid)!.leads.push(f.lead.businessName);
  }

  const results = await Promise.allSettled(
    [...byUser.values()].map(({ userId, leads }) => {
      const count = leads.length;
      const preview = leads.slice(0, 2).join(", ") + (count > 2 ? ` +${count - 2} more` : "");
      return sendPushToUser(userId, {
        title: `${count} follow-up${count > 1 ? "s" : ""} due today`,
        body: preview,
        icon: "/icon-192.png",
        url: "/deals",
      });
    })
  );

  const sent = results.filter(r => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, usersNotified: sent, followUpsFound: followUps.length });
}
