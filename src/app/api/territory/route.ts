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

  const body = await req.json() as Record<string, unknown>;

  // Strip server-managed fields that must never be set by the client
  const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...raw } = body;
  const data = {
    city: raw.city as string,
    metro: raw.metro as string,
    category: raw.category as string,
    totalBusinesses: Number(raw.totalBusinesses ?? 0),
    contacted: Number(raw.contacted ?? 0),
    meetings: Number(raw.meetings ?? 0),
    activeLeads: Number(raw.activeLeads ?? 0),
    clientsWon: Number(raw.clientsWon ?? 0),
    mrr: Number(raw.mrr ?? 0),
    notes: raw.notes ? String(raw.notes) : null,
  };

  const entry = await prisma.territoryEntry.upsert({
    where: { userId_city_category: { userId: session.user.id, city: data.city, category: data.category } },
    create: { userId: session.user.id, ...data },
    update: data,
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
