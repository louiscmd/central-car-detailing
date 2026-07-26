import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  const record = await prisma.bizHubHistory.findUnique({
    where: { userId_year: { userId: session.user.id, year } },
  });

  return NextResponse.json(record ? { months: record.months } : { months: null });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const { months } = await req.json() as { months: Prisma.InputJsonValue };

  const record = await prisma.bizHubHistory.upsert({
    where: { userId_year: { userId: session.user.id, year } },
    update: { months },
    create: { userId: session.user.id, year, months },
  });

  return NextResponse.json({ months: record.months });
}
