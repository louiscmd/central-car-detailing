import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const stage = await prisma.pipelineStage.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: body,
  });
  return NextResponse.json(stage);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadsInStage = await prisma.lead.count({ where: { stageId: params.id, userId: session.user.id } });
  if (leadsInStage > 0) return NextResponse.json({ error: "Stage has leads" }, { status: 400 });

  await prisma.pipelineStage.deleteMany({ where: { id: params.id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
