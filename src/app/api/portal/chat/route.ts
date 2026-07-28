import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getClientId(userId: string, role: string, sessionClientId: string | undefined, explicitClientId?: string | null): Promise<string | null> {
  if (role === "CLIENT") return sessionClientId ?? null;
  if (explicitClientId) {
    const owns = await prisma.client.findFirst({
      where: { id: explicitClientId, userId },
      select: { id: true },
    });
    return owns ? explicitClientId : null;
  }
  const jar = await cookies();
  return jar.get("view-as-client")?.value ?? null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");
  const explicitClientId = url.searchParams.get("clientId");

  const role = (session.user as { role?: string; clientId?: string })?.role ?? "";
  const sessionClientId = (session.user as { clientId?: string })?.clientId;
  const clientId = await getClientId(session.user.id, role, sessionClientId, explicitClientId);
  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  const where = channelId
    ? { channelId, clientId }
    : { clientId, channelId: null };

  const messages = await prisma.chatMessage.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true, role: true } },
      attachments: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark unread
  if (role !== "CLIENT") {
    await prisma.chatMessage.updateMany({
      where: { ...where, read: false, senderId: { not: session.user.id } },
      data: { read: true },
    });
  }

  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    content?: string;
    channelId?: string;
    clientId?: string;
    attachments?: { url: string; type: string; filename: string; size: number }[];
  };

  const role = (session.user as { role?: string; clientId?: string })?.role ?? "";
  const sessionClientId = (session.user as { clientId?: string })?.clientId;
  const clientId = await getClientId(session.user.id, role, sessionClientId, body.clientId);
  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  if (!body.content?.trim() && !body.attachments?.length) {
    return NextResponse.json({ error: "Message or attachment required" }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      clientId,
      channelId: body.channelId ?? null,
      senderId: session.user.id,
      content: body.content?.trim() ?? null,
      attachments: body.attachments?.length
        ? {
            create: body.attachments.map(a => ({
              url: a.url,
              type: a.type as "IMAGE" | "VIDEO" | "AUDIO" | "FILE",
              filename: a.filename,
              size: a.size,
            })),
          }
        : undefined,
    },
    include: {
      sender: { select: { id: true, name: true, role: true } },
      attachments: true,
    },
  });

  return NextResponse.json(message, { status: 201 });
}
