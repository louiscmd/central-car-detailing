import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.territorySettings.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(settings ?? null);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const settings = await prisma.territorySettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...body },
    update: body,
  });
  return NextResponse.json(settings);
}
