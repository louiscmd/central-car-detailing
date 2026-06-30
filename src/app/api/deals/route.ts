import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/lead-scoring";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stageId = searchParams.get("stageId");
  const category = searchParams.get("category");
  const city = searchParams.get("city");
  const source = searchParams.get("source");

  const leads = await prisma.lead.findMany({
    where: {
      userId: session.user.id,
      ...(stageId ? { stageId } : {}),
      ...(category ? { category } : {}),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(source ? { source: source as never } : {}),
    },
    include: {
      stage: true,
      activities: { orderBy: { createdAt: "desc" as const }, take: 1 },
      followUps: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 1 },
      _count: { select: { activities: true, followUps: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(leads);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { stageId, ...data } = body;

  const lead = await prisma.lead.create({
    data: {
      userId: session.user.id,
      stageId,
      ...data,
    },
  });

  await prisma.leadActivity.create({
    data: { leadId: lead.id, type: "CREATED", note: `Lead added from ${data.source ?? "OTHER"}` },
  });

  const score = await calcScore(lead.id);
  await prisma.lead.update({ where: { id: lead.id }, data: { score } });

  // Re-fetch with activities so the client gets a complete object
  const full = await prisma.lead.findUnique({
    where: { id: lead.id },
    include: {
      stage: true,
      activities: { orderBy: { createdAt: "desc" as const }, take: 1 },
      followUps: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 1 },
      _count: { select: { activities: true, followUps: true } },
    },
  });

  return NextResponse.json(full);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await prisma.lead.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ deleted: count });
}
