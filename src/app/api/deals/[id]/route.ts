import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/lead-scoring";

const INCLUDE = {
  stage: true,
  activities: { orderBy: { createdAt: "desc" as const } },
  followUps: { orderBy: { dueDate: "asc" as const } },
  _count: { select: { activities: true, followUps: true } },
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const lead = await prisma.lead.findFirst({ where: { id, userId: session.user.id }, include: INCLUDE });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { id: _id, stage: _stage, activities: _a, followUps: _f, _count: _c, ...data } = body;

  const result = await prisma.lead.updateMany({ where: { id, userId: session.user.id }, data });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (data.notes !== undefined) {
    await prisma.leadActivity.create({ data: { leadId: id, type: "NOTE_ADDED", note: data.notes } });
  }

  const score = await calcScore(id);
  await prisma.lead.update({ where: { id }, data: { score } });

  const updated = await prisma.lead.findUnique({ where: { id }, include: INCLUDE });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await prisma.lead.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
