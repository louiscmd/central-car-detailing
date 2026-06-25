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
    prisma.pipelineStage.findMany({ where: { userId: session.user.id }, select: { id: true, name: true } }),
    prisma.lead.findMany({
      where: { userId: session.user.id, source: "FACEBOOK_MESSAGE" },
      select: { businessName: true },
    }),
  ]);

  const stageMap = Object.fromEntries(stages.map(s => [s.name, s.id]));
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
        score: l.stage === "Interested" ? 80 : l.stage === "Replied" ? 40 : 10,
      })),
    });
  }

  return NextResponse.json({ added: toCreate.length, skipped: leads.length - toCreate.length, total: leads.length });
}
