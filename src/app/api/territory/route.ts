import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.territoryEntry.findMany({
    where: { userId: session.user.id },
    orderBy: [{ metro: "asc" }, { city: "asc" }],
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    city: string; metro: string; category: string;
    totalBusinesses?: number; contacted?: number; meetings?: number;
    activeLeads?: number; clientsWon?: number; mrr?: number; notes?: string;
  };

  const entry = await prisma.territoryEntry.upsert({
    where: { userId_city_category: { userId: session.user.id, city: body.city, category: body.category } },
    create: { userId: session.user.id, ...body },
    update: body,
  });
  return NextResponse.json(entry);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id: string };
  await prisma.territoryEntry.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
