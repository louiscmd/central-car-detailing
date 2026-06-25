import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as {
    title?: string;
    completed?: boolean;
    dueDate?: string | null;
    groupId?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
  };

  await prisma.task.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.groupId !== undefined && { groupId: body.groupId }),
      ...(body.scheduledStart !== undefined && { scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null }),
      ...(body.scheduledEnd !== undefined && { scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null }),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.task.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
