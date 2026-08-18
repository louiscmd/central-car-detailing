import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

function convKeyIncludes(key: string, userId: string) {
  return key.split(":").includes(userId);
}

async function getClientId(userId: string, role: string, sessionClientId: string | undefined, explicitClientId?: string | null): Promise<string | null> {
  if (role === "CLIENT") return sessionClientId ?? null;
  if (explicitClientId) {
    const owns = await prisma.client.findFirst({ where: { id: explicitClientId, userId }, select: { id: true } });
    return owns ? explicitClientId : null;
  }
  return null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");
  const conversationKey = url.searchParams.get("conversationKey");
  const explicitClientId = url.searchParams.get("clientId");
  const role = (session.user as { role?: string; clientId?: string })?.role ?? "";

  if (conversationKey) {
    if (!convKeyIncludes(conversationKey, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const where = channelId
      ? { channelId, conversationKey }
      : { conversationKey, channelId: null as null };
    const messages = await prisma.chatMessage.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, role: true } },
        attachments: true,
        replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  }

  const sessionClientId = (session.user as { clientId?: string })?.clientId;
  const clientId = await getClientId(session.user.id, role, sessionClientId, explicitClientId);
  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  const where = channelId ? { channelId, clientId } : { clientId, channelId: null as null };
  const messages = await prisma.chatMessage.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true, role: true } },
      attachments: true,
      replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

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
    conversationKey?: string;
    replyToId?: string;
    attachments?: { url: string; type: string; filename: string; size: number }[];
  };

  if (!body.content?.trim() && !body.attachments?.length) {
    return NextResponse.json({ error: "Message or attachment required" }, { status: 400 });
  }

  const role = (session.user as { role?: string; clientId?: string })?.role ?? "";
  const senderName = session.user.name ?? "Someone";

  // conversationKey-based (partner chat)
  if (body.conversationKey) {
    if (!convKeyIncludes(body.conversationKey, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const message = await prisma.chatMessage.create({
      data: {
        conversationKey: body.conversationKey,
        channelId: body.channelId ?? null,
        senderId: session.user.id,
        content: body.content?.trim() ?? null,
        replyToId: body.replyToId ?? null,
        attachments: body.attachments?.length
          ? { create: body.attachments.map(a => ({ url: a.url, type: a.type as "IMAGE" | "VIDEO" | "AUDIO" | "FILE", filename: a.filename, size: a.size })) }
          : undefined,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        attachments: true,
        replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
      },
    });

    // Notify the other party
    const otherUserId = body.conversationKey.split(":").find(id => id !== session.user!.id);
    if (otherUserId) {
      const preview = body.content?.slice(0, 60) ?? (body.attachments?.[0]?.type === "AUDIO" ? "🎤 Voice note" : body.attachments?.[0]?.type === "IMAGE" ? "📷 Image" : "📎 File");
      // Resolve the correct URL based on recipient role
      const recipient = await prisma.user.findUnique({ where: { id: otherUserId }, select: { role: true } });
      const chatUrl = recipient?.role === "CLIENT" ? "/portal/chat" : "/chat";

      await prisma.notification.create({
        data: {
          userId: otherUserId,
          type: "NEW_MESSAGE",
          title: `New message from ${senderName}`,
          body: preview,
          link: chatUrl,
        },
      });

      sendPushToUser(otherUserId, {
        title: `New message from ${senderName}`,
        body: preview,
        icon: "/icon-192.png",
        url: chatUrl,
      }).catch(() => {});
    }

    return NextResponse.json(message, { status: 201 });
  }

  // Legacy clientId-based
  const sessionClientId = (session.user as { clientId?: string })?.clientId;
  const clientId = await getClientId(session.user.id, role, sessionClientId, body.clientId);
  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  const message = await prisma.chatMessage.create({
    data: {
      clientId,
      channelId: body.channelId ?? null,
      senderId: session.user.id,
      content: body.content?.trim() ?? null,
      replyToId: body.replyToId ?? null,
      attachments: body.attachments?.length
        ? { create: body.attachments.map(a => ({ url: a.url, type: a.type as "IMAGE" | "VIDEO" | "AUDIO" | "FILE", filename: a.filename, size: a.size })) }
        : undefined,
    },
    include: {
      sender: { select: { id: true, name: true, role: true } },
      attachments: true,
      replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
    },
  });

  const preview = message.content?.slice(0, 60) ?? (message.attachments[0]?.type === "AUDIO" ? "🎤 Voice note" : message.attachments[0]?.type === "IMAGE" ? "📷 Image" : message.attachments[0]?.type === "VIDEO" ? "🎥 Video" : "📎 File");

  if (role === "CLIENT") {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { userId: true, name: true } });
    if (client) sendPushToUser(client.userId, { title: `New message from ${client.name}`, body: preview, icon: "/icon-192.png", url: `/clients/${clientId}/chat` }).catch(() => {});
  } else {
    const portal = await prisma.clientPortal.findUnique({ where: { clientId }, select: { userId: true } });
    if (portal) sendPushToUser(portal.userId, { title: `New message from ${senderName}`, body: preview, icon: "/icon-192.png", url: "/portal/chat" }).catch(() => {});
  }

  return NextResponse.json(message, { status: 201 });
}
