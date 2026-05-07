import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const tag = searchParams.get("tag") ?? "";

  const clients = await prisma.client.findMany({
    where: {
      userId: session.user.id,
      ...(search && { name: { contains: search, mode: "insensitive" } }),
      ...(tag && { tags: { has: tag } }),
    },
    include: {
      accounts: {
        select: {
          id: true,
          platform: true,
          username: true,
          profileUrl: true,
          displayName: true,
          avatarUrl: true,
          isPaused: true,
          lastScraped: true,
        },
      },
      _count: { select: { accounts: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ data: clients });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
    },
    include: { accounts: true },
  });

  return NextResponse.json({ data: client }, { status: 201 });
}
