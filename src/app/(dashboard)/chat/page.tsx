import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Hash } from "lucide-react";

export default async function ChatInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Get all clients with their latest message and unread count
  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      channels: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, name: true },
      },
      chatMessages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          read: true,
          sender: { select: { name: true } },
          attachments: { select: { type: true }, take: 1 },
        },
      },
      _count: {
        select: { chatMessages: { where: { read: false, senderId: { not: session.user.id } } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const withMessages = clients.filter(c => c.chatMessages.length > 0 || c.channels.length > 0);
  const noMessages = clients.filter(c => c.chatMessages.length === 0 && c.channels.length === 0);

  function preview(msg: typeof clients[0]["chatMessages"][0] | undefined) {
    if (!msg) return "No messages yet";
    if (msg.attachments[0]?.type === "IMAGE") return "📷 Image";
    if (msg.attachments[0]?.type === "VIDEO") return "🎥 Video";
    if (msg.attachments[0]?.type === "AUDIO") return "🎤 Voice note";
    if (msg.attachments[0]?.type === "FILE") return "📎 File";
    return msg.content ?? "…";
  }

  function timeAgo(date: Date) {
    const diff = Date.now() - date.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Chat</h1>

      {clients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <MessageSquare className="w-10 h-10 opacity-30" />
          <p className="text-sm">No clients yet. Add one from the Clients page to start chatting.</p>
        </div>
      )}

      {withMessages.length > 0 && (
        <ul className="space-y-1">
          {withMessages.map(client => {
            const last = client.chatMessages[0];
            const unread = client._count.chatMessages;
            return (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}/chat`}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{client.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {last && <span className="text-[10px] text-muted-foreground">{timeAgo(new Date(last.createdAt))}</span>}
                        {unread > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {last?.sender?.name && <span className="font-medium">{last.sender.name}: </span>}
                      {preview(last)}
                    </p>
                    {client.channels.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Hash className="w-2.5 h-2.5 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground/50">{client.channels[0].name}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {noMessages.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-1 pt-2">No messages yet</p>
          {noMessages.map(client => (
            <Link
              key={client.id}
              href={`/clients/${client.id}/chat`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent transition-colors opacity-60"
            >
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {client.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm text-muted-foreground">{client.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
