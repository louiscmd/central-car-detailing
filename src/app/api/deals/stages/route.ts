import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STAGES } from "@/lib/deal-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let stages = await prisma.pipelineStage.findMany({
    where: { userId: session.user.id },
    orderBy: { position: "asc" },
    include: { _count: { select: { leads: true } } },
  });

  if (stages.length === 0) {
    const userId = session.user.id;
    stages = await prisma.$transaction(
      DEFAULT_STAGES.map(s =>
        prisma.pipelineStage.create({
          data: { userId, ...s },
          include: { _count: { select: { leads: true } } },
        })
      )
    );
  }

  return NextResponse.json(stages);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await req.json();
  const last = await prisma.pipelineStage.findFirst({
    where: { userId: session.user.id },
    orderBy: { position: "desc" },
  });
  const stage = await prisma.pipelineStage.create({
    data: { userId: session.user.id, name, color: color ?? "#6366f1", position: (last?.position ?? -1) + 1 },
    include: { _count: { select: { leads: true } } },
  });
  return NextResponse.json(stage);
}
