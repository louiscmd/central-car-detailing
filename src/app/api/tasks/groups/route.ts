import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json() as { name: string };
  const count = await prisma.taskGroup.count({ where: { userId: session.user.id } });

  const group = await prisma.taskGroup.create({
    data: { userId: session.user.id, name, position: count },
    include: { tasks: true },
  });

  return NextResponse.json(group, { status: 201 });
}
