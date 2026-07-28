import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getClientId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string; clientId?: string })?.role;
  if (role === "CLIENT") {
    return (session.user as { clientId?: string })?.clientId ?? null;
  }
  const jar = await cookies();
  return jar.get("view-as-client")?.value ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  const messages = await prisma.chatMessage.findMany({
    where: { clientId },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  const role = (session.user as { role?: string })?.role;
  if (role !== "CLIENT") {
    await prisma.chatMessage.updateMany({
      where: { clientId, read: false, senderId: { not: session.user.id } },
      data: { read: true },
    });
  }

  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  const { content } = await req.json() as { content: string };
  if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const message = await prisma.chatMessage.create({
    data: { clientId, senderId: session.user.id, content: content.trim() },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}
