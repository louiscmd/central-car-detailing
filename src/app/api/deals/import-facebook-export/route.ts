import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface LeadInput {
  businessName: string;
  stage: string;
  notes?: string;
  phone?: string;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leads } = await req.json() as { leads: LeadInput[] };
  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ added: 0, skipped: 0, total: 0 });
  }

  const [stages, existing] = await Promise.all([
    prisma.pipelineStage.findMany({ where: { userId: session.user.id }, select: { id: true, name: true, position: true } }),
    prisma.lead.findMany({
      where: { userId: session.user.id, source: "FACEBOOK_MESSAGE" },
      select: { businessName: true },
    }),
  ]);

  let stageMap = Object.fromEntries(stages.map(s => [s.name, s.id]));

  // Ensure all pipeline stages exist; create any that are missing
  const REQUIRED_STAGES = [
    { name: "Contacted",                color: "#6366f1", position: 0 },
    { name: "Positive reply",           color: "#22c55e", position: 1 },
    { name: "Negative reply",           color: "#ef4444", position: 2 },
    { name: "Meeting / call scheduled", color: "#8b5cf6", position: 3 },
    { name: "Verbal yes",               color: "#f59e0b", position: 4 },
    { name: "Client won",               color: "#10b981", position: 5 },
    { name: "Client lost",              color: "#6b7280", position: 6 },
  ];
  for (const s of REQUIRED_STAGES) {
    if (!stageMap[s.name]) {
      const created = await prisma.pipelineStage.create({
        data: { userId: session.user!.id!, name: s.name, color: s.color, position: s.position },
      });
      stageMap = { ...stageMap, [s.name]: created.id };
    }
  }

  const SCORE: Record<string, number> = {
    "Contacted": 10, "Positive reply": 40, "Negative reply": 5,
    "Meeting / call scheduled": 60, "Verbal yes": 75, "Client won": 100, "Client lost": 0,
  };

  const defaultStageId = stageMap["Contacted"] ?? stages[0]?.id;
  const existingNames = new Set(existing.map(l => l.businessName.toLowerCase().trim()));

  const toCreate = leads.filter(l => !existingNames.has(l.businessName.toLowerCase().trim()));

  if (toCreate.length > 0) {
    await prisma.lead.createMany({
      data: toCreate.map(l => ({
        userId: session.user!.id!,
        stageId: stageMap[l.stage] ?? defaultStageId,
        businessName: l.businessName,
        source: "FACEBOOK_MESSAGE",
        notes: l.notes ?? null,
        phone: l.phone ?? null,
        score: SCORE[l.stage] ?? 10,
      })),
    });
  }

  return NextResponse.json({ added: toCreate.length, skipped: leads.length - toCreate.length, total: leads.length });
}
