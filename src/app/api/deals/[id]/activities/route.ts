import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activities = await prisma.leadActivity.findMany({
    where: { leadId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(activities);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { type, note } = await req.json();
  const activity = await prisma.leadActivity.create({ data: { leadId: params.id, type, note } });
  return NextResponse.json(activity);
}
