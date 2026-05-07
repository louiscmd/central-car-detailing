import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPaused: z.boolean().optional(),
});

async function verifyOwnership(clientId: string, userId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
  });
  return client;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await verifyOwnership(id, session.user.id);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const full = await prisma.client.findUnique({
    where: { id },
    include: {
      accounts: {
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 30,
          },
        },
      },
    },
  });

  return NextResponse.json({ data: full });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await verifyOwnership(id, session.user.id);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.client.update({
    where: { id },
    data: parsed.data,
    include: { accounts: true },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await verifyOwnership(id, session.user.id);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" });
}
