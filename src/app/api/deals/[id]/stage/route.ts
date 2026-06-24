import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/lead-scoring";
import { STAGE_AUTO_FOLLOWUPS } from "@/lib/deal-utils";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stageId } = await req.json();

  const lead = await prisma.lead.findFirst({ where: { id: params.id, userId: session.user.id }, include: { stage: true } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newStage = await prisma.pipelineStage.findFirst({ where: { id: stageId, userId: session.user.id } });
  if (!newStage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  await prisma.lead.update({ where: { id: params.id }, data: { stageId } });

  await prisma.leadActivity.create({
    data: {
      leadId: params.id,
      type: newStage.name === "Client Won" ? "WON" : newStage.name === "Client Lost" ? "LOST" : "STAGE_CHANGED",
      note: `Moved from "${lead.stage.name}" to "${newStage.name}"`,
      metadata: { fromStage: lead.stage.name, toStage: newStage.name },
    },
  });

  // Auto-schedule follow-up if stage has automation
  const auto = STAGE_AUTO_FOLLOWUPS[newStage.name];
  if (auto) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + auto.days);
    await prisma.followUp.create({
      data: { leadId: params.id, dueDate, note: auto.note, priority: auto.priority as never },
    });
    await prisma.leadActivity.create({
      data: { leadId: params.id, type: "FOLLOW_UP_SCHEDULED", note: `Auto-scheduled: ${auto.note}` },
    });
  }

  const score = await calcScore(params.id);
  await prisma.lead.update({ where: { id: params.id }, data: { score } });

  return NextResponse.json({ ok: true, score, autoFollowUp: !!auto });
}
