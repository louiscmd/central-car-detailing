import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [groups, ungrouped] = await Promise.all([
    prisma.taskGroup.findMany({
      where: { userId: session.user.id },
      include: { tasks: { orderBy: { position: "asc" } } },
      orderBy: { position: "asc" },
    }),
    prisma.task.findMany({
      where: { userId: session.user.id, groupId: null },
      orderBy: { position: "asc" },
    }),
  ]);

  return NextResponse.json({ groups, ungrouped });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    title: string;
    groupId?: string;
    dueDate?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
  };

  const count = await prisma.task.count({
    where: { userId: session.user.id, groupId: body.groupId ?? null },
  });

  const task = await prisma.task.create({
    data: {
      userId: session.user.id,
      title: body.title,
      groupId: body.groupId ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
      position: count,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.task.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
