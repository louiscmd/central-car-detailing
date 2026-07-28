import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileText, MessageSquare, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function PortalOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string; clientId?: string })?.role;
  let clientId: string | null = null;

  if (role === "CLIENT") {
    clientId = (session.user as { clientId?: string })?.clientId ?? null;
  } else {
    const jar = await cookies();
    clientId = jar.get("view-as-client")?.value ?? null;
  }

  if (!clientId) redirect("/dashboard");

  const [client, recentReports, unreadCount, lastMessage] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, tags: true, accounts: { select: { platform: true, username: true } } },
    }),
    prisma.report.findMany({
      where: { clientId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 3,
      select: { id: true, title: true, month: true, year: true, createdAt: true },
    }),
    prisma.chatMessage.count({
      where: { clientId, read: false },
    }),
    prisma.chatMessage.findFirst({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      select: { content: true, createdAt: true, sender: { select: { name: true, role: true } } },
    }),
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{client?.name ?? "Your Portal"}</h2>
        {client?.tags?.length ? (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {client.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Social accounts */}
        <div className="col-span-1 sm:col-span-1 rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Platforms</span>
          </div>
          {client?.accounts?.length ? (
            <ul className="space-y-1.5">
              {client.accounts.map(acc => (
                <li key={acc.platform + acc.username} className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground w-14 shrink-0">{acc.platform}</span>
                  <span className="text-xs truncate">@{acc.username}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No accounts linked yet.</p>
          )}
        </div>

        {/* Recent reports */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Reports</span>
            </div>
            <Link href="/portal/reports" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recentReports.length ? (
            <ul className="space-y-2">
              {recentReports.map(r => (
                <li key={r.id} className="text-xs">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-muted-foreground ml-1">— {monthNames[r.month - 1]} {r.year}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No reports yet.</p>
          )}
        </div>

        {/* Chat preview */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Chat</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <Link href="/portal/chat" className="text-xs text-primary hover:underline">Open</Link>
          </div>
          {lastMessage ? (
            <div className="space-y-0.5">
              <p className="text-xs font-medium">{lastMessage.sender.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{lastMessage.content}</p>
              <p className="text-[10px] text-muted-foreground/60">
                {new Date(lastMessage.createdAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No messages yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
