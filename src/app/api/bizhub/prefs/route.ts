import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.bizHubPrefs.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(prefs ? { currency: prefs.currency } : { currency: null });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currency } = await req.json() as { currency: string };

  const prefs = await prisma.bizHubPrefs.upsert({
    where: { userId: session.user.id },
    update: { currency },
    create: { userId: session.user.id, currency },
  });

  return NextResponse.json({ currency: prefs.currency });
}
