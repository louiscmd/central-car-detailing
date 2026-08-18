import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function convKeyIncludes(key: string, userId: string) {
  return key.split(":").includes(userId);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const conversationKey = url.searchParams.get("conversationKey");
  const explicitClientId = url.searchParams.get("clientId");
  const role = (session.user as { role?: string; clientId?: string })?.role;

  if (conversationKey) {
    if (!convKeyIncludes(conversationKey, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const channels = await prisma.channel.findMany({
      where: { conversationKey },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, createdAt: true, createdById: true },
    });
    return NextResponse.json(channels);
  }

  let clientId: string | null = null;
  if (role === "CLIENT") {
    clientId = (session.user as { clientId?: string })?.clientId ?? null;
  } else if (explicitClientId) {
    const client = await prisma.client.findFirst({
      where: { id: explicitClientId, userId: session.user.id },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    clientId = explicitClientId;
  }

  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  const channels = await prisma.channel.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, createdAt: true, createdById: true },
  });

  return NextResponse.json(channels);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { name: string; clientId?: string; conversationKey?: string };
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const slug = body.name.trim().toLowerCase().replace(/\s+/g, "-");

  if (body.conversationKey) {
    if (!convKeyIncludes(body.conversationKey, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const channel = await prisma.channel.create({
      data: { conversationKey: body.conversationKey, name: slug, createdById: session.user.id },
      select: { id: true, name: true, createdAt: true },
    });
    return NextResponse.json(channel, { status: 201 });
  }

  const role = (session.user as { role?: string; clientId?: string })?.role;
  let clientId: string | null = null;
  if (role === "CLIENT") {
    clientId = (session.user as { clientId?: string })?.clientId ?? null;
  } else if (body.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: body.clientId, userId: session.user.id },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    clientId = body.clientId;
  }

  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  try {
    const channel = await prisma.channel.create({
      data: { clientId, name: slug, createdById: session.user.id },
      select: { id: true, name: true, createdAt: true },
    });
    return NextResponse.json(channel, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Channel name already exists" }, { status: 409 });
  }
}
