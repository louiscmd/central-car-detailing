import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/lead-scoring";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const followUps = await prisma.followUp.findMany({
    where: { leadId: params.id },
    orderBy: { dueDate: "asc" },
  });
  return NextResponse.json(followUps);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { dueDate, priority, note } = await req.json();
  const followUp = await prisma.followUp.create({
    data: { leadId: params.id, dueDate: new Date(dueDate), priority: priority ?? "MEDIUM", note },
  });

  await prisma.leadActivity.create({
    data: { leadId: params.id, type: "FOLLOW_UP_SCHEDULED", note: `Follow-up scheduled for ${new Date(dueDate).toLocaleDateString("en-GB")}${note ? `: ${note}` : ""}` },
  });

  const score = await calcScore(params.id);
  await prisma.lead.update({ where: { id: params.id }, data: { score } });

  return NextResponse.json(followUp);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { followUpId, note } = await req.json();

  const followUp = await prisma.followUp.findFirst({
    where: { id: followUpId, lead: { userId: session.user.id } },
  });
  if (!followUp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.followUp.update({
    where: { id: followUpId },
    data: { completed: true, completedAt: new Date() },
  });

  await prisma.leadActivity.create({
    data: { leadId: params.id, type: "FOLLOW_UP_COMPLETED", note: note || "Follow-up completed" },
  });

  const score = await calcScore(params.id);
  await prisma.lead.update({ where: { id: params.id }, data: { score } });

  return NextResponse.json({ ok: true });
}
