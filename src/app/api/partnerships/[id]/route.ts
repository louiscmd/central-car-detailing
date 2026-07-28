import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const { action } = await req.json(); // "accept" | "decline"
  if (!["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const partnership = await prisma.partnership.findUnique({ where: { id } });
  if (!partnership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (partnership.inviteeId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (partnership.status !== "PENDING") return NextResponse.json({ error: "Already responded" }, { status: 409 });

  const status = action === "accept" ? "ACCEPTED" : "DECLINED";
  const updated = await prisma.partnership.update({ where: { id }, data: { status } });

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } });
  const myName = me?.name ?? me?.username ?? "Your partner";

  if (action === "accept") {
    // Auto-create a Client record so manager can chat/send reports
    const existing = await prisma.client.findFirst({
      where: { userId: partnership.inviterId, name: myName },
    });
    const client = existing ?? await prisma.client.create({
      data: { name: myName, userId: partnership.inviterId },
    });

    // Seed default channels
    await prisma.channel.createMany({
      data: [
        { clientId: client.id, name: "general", createdById: userId },
        { clientId: client.id, name: "reports", createdById: userId },
        { clientId: client.id, name: "updates", createdById: userId },
      ],
      skipDuplicates: true,
    });

    // Link client to partnership
    await prisma.partnership.update({ where: { id }, data: { linkedClientId: client.id } });

    await prisma.notification.create({
      data: {
        userId: partnership.inviterId,
        type: "PARTNERSHIP_ACCEPTED",
        title: "Partnership accepted",
        body: `${myName} accepted your partnership invite.`,
        link: `/clients/${client.id}`,
      },
    });
  } else {
    await prisma.notification.create({
      data: {
        userId: partnership.inviterId,
        type: "PARTNERSHIP_DECLINED",
        title: "Partnership declined",
        body: `${myName} declined your partnership invite.`,
        link: "/partners",
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const partnership = await prisma.partnership.findUnique({ where: { id } });
  if (!partnership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (partnership.inviterId !== userId && partnership.inviteeId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.partnership.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
