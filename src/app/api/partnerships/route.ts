import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [sent, received] = await Promise.all([
    prisma.partnership.findMany({
      where: { inviterId: userId },
      include: { invitee: { select: { id: true, name: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partnership.findMany({
      where: { inviteeId: userId },
      include: { inviter: { select: { id: true, name: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ sent, received });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { username, message } = await req.json();
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { username: username.replace(/^@/, "") },
    select: { id: true, name: true, username: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === userId) return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });

  const existing = await prisma.partnership.findFirst({
    where: {
      OR: [
        { inviterId: userId, inviteeId: target.id },
        { inviterId: target.id, inviteeId: userId },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: "Partnership already exists" }, { status: 409 });

  const partnership = await prisma.partnership.create({
    data: { inviterId: userId, inviteeId: target.id, message: message ?? null },
  });

  const inviterName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }));
  const displayName = inviterName?.name ?? (inviterName?.username ? `@${inviterName.username}` : "Someone");

  await prisma.notification.create({
    data: {
      userId: target.id,
      type: "PARTNERSHIP_INVITE",
      title: "Partnership invite",
      body: `${displayName} sent you a partnership invite.`,
      link: "/partners",
    },
  });

  // Fire-and-forget push
  sendPushToUser(target.id, {
    title: "New partnership invite",
    body: `${displayName} wants to connect with you.`,
    icon: "/icon-192.png",
    url: "/partners",
  }).catch(() => {});

  return NextResponse.json(partnership, { status: 201 });
}
