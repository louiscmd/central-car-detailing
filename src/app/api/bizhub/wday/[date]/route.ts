import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const record = await prisma.bizHubWDay.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });

  return NextResponse.json(record ? { checks: record.checks } : { checks: null });
}

export async function PUT(req: Request, { params }: { params: Promise<{ date: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const { checks } = await req.json() as { checks: Prisma.InputJsonValue };

  const record = await prisma.bizHubWDay.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: { checks },
    create: { userId: session.user.id, date, checks },
  });

  return NextResponse.json({ checks: record.checks });
}
