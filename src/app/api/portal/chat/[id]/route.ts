import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json() as { content: string };
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const message = await prisma.chatMessage.findUnique({ where: { id }, select: { senderId: true } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.senderId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.chatMessage.update({
    where: { id },
    data: { content: content.trim(), editedAt: new Date() },
    include: {
      sender: { select: { id: true, name: true, role: true } },
      attachments: true,
      replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const message = await prisma.chatMessage.findUnique({
    where: { id },
    select: { senderId: true },
  });

  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.senderId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.chatMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
