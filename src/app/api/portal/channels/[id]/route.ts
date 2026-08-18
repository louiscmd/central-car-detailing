import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function canModify(channelId: string, userId: string): Promise<boolean> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      createdById: true,
      conversationKey: true,
      client: { select: { userId: true } },
    },
  });
  if (!channel) return false;
  if (channel.createdById === userId) return true;
  if (channel.conversationKey?.split(":").includes(userId)) return true;
  if (channel.client?.userId === userId) return true;
  return false;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  if (!(await canModify(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  const updated = await prisma.channel.update({ where: { id }, data: { name: slug }, select: { id: true, name: true } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (!(await canModify(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.channel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
