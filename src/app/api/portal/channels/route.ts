import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const explicitClientId = url.searchParams.get("clientId");

  let clientId: string | null = null;
  const role = (session.user as { role?: string; clientId?: string })?.role;

  if (role === "CLIENT") {
    clientId = (session.user as { clientId?: string })?.clientId ?? null;
  } else if (explicitClientId) {
    // Manager: verify they own this client
    const client = await prisma.client.findFirst({
      where: { id: explicitClientId, userId: session.user.id },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    clientId = explicitClientId;
  } else {
    const jar = await cookies();
    clientId = jar.get("view-as-client")?.value ?? null;
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

  const { name, clientId: bodyClientId } = await req.json() as { name: string; clientId?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const role = (session.user as { role?: string; clientId?: string })?.role;
  let clientId: string | null = null;

  if (role === "CLIENT") {
    clientId = (session.user as { clientId?: string })?.clientId ?? null;
  } else if (bodyClientId) {
    const client = await prisma.client.findFirst({
      where: { id: bodyClientId, userId: session.user.id },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    clientId = bodyClientId;
  } else {
    const jar = await cookies();
    clientId = jar.get("view-as-client")?.value ?? null;
  }

  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

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
