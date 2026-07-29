import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SignupsChart, PartnershipFunnel, RetentionBars } from "@/components/admin/admin-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, MessageSquare, FileText, Zap, Bell, Activity,
  UserCheck, AlertTriangle, TrendingUp, CheckCircle2, XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const metadata = { title: "Admin" };
export const revalidate = 60;

function roleColor(role: string) {
  if (role === "ADMIN") return "bg-amber-500/15 text-amber-600 border-amber-500/20";
  if (role === "CLIENT") return "bg-blue-500/15 text-blue-600 border-blue-500/20";
  return "bg-primary/15 text-primary border-primary/20";
}

function timeAgo(date: Date | null) {
  if (!date) return "Never";
  return formatDistanceToNow(date, { addSuffix: true });
}

export default async function AdminPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user?.id || role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    allUsers,
    clientCount,
    messagesThisWeek,
    partnershipsAll,
    reportCount,
    pushSubCount,
    scrapeStats,
    recentReports,
    recentPartnerships,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, username: true, role: true,
        createdAt: true, lastActiveAt: true,
        _count: { select: { pushSubscriptions: true } },
      },
    }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.chatMessage.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.partnership.findMany({
      select: { status: true, createdAt: true, inviter: { select: { name: true, username: true } }, invitee: { select: { name: true, username: true } } },
    }),
    prisma.report.count(),
    prisma.pushSubscription.count(),
    prisma.dailySnapshot.groupBy({
      by: ["status"],
      _count: true,
      where: { createdAt: { gte: weekAgo } },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, title: true, createdAt: true, client: { select: { name: true } } },
    }),
    prisma.partnership.findMany({
      orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, status: true, createdAt: true, inviter: { select: { name: true } }, invitee: { select: { name: true } } },
    }),
  ]);

  const managerUsers = allUsers.filter(u => u.role !== "CLIENT");
  const totalUsers = managerUsers.length;

  // Retention
  const dau = managerUsers.filter(u => u.lastActiveAt && u.lastActiveAt >= dayAgo).length;
  const wau = managerUsers.filter(u => u.lastActiveAt && u.lastActiveAt >= weekAgo).length;

  // Signups last 30 days
  const signupMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    signupMap.set(d.toISOString().slice(0, 10), 0);
  }
  allUsers.forEach(u => {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (signupMap.has(key)) signupMap.set(key, (signupMap.get(key) ?? 0) + 1);
  });
  const signupData = [...signupMap.entries()].map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    count,
  }));

  // Partnership funnel
  const pPending = partnershipsAll.filter(p => p.status === "PENDING").length;
  const pAccepted = partnershipsAll.filter(p => p.status === "ACCEPTED").length;
  const pDeclined = partnershipsAll.filter(p => p.status === "DECLINED").length;
  const funnelData = [
    { name: "Sent", value: partnershipsAll.length, fill: "hsl(var(--primary))" },
    { name: "Accepted", value: pAccepted, fill: "hsl(142, 71%, 45%)" },
    { name: "Pending", value: pPending, fill: "hsl(48, 96%, 53%)" },
    { name: "Declined", value: pDeclined, fill: "hsl(var(--destructive))" },
  ];

  // Platform health
  const scrapeSuccess = scrapeStats.find(s => s.status === "SUCCESS")?._count ?? 0;
  const scrapeFailed = scrapeStats.find(s => s.status === "FAILED")?._count ?? 0;
  const scrapeTotal = scrapeSuccess + scrapeFailed;
  const scrapeRate = scrapeTotal ? Math.round((scrapeSuccess / scrapeTotal) * 100) : null;
  const pushCoverage = totalUsers ? Math.round((pushSubCount / totalUsers) * 100) : 0;

  // Activity feed — merge recent events
  const recentUsers = allUsers.slice(0, 5).map(u => ({
    id: u.id, type: "signup" as const,
    label: `${u.name ?? u.email} joined`,
    sub: u.role,
    at: u.createdAt,
  }));
  const recentReportEvents = recentReports.map(r => ({
    id: r.id, type: "report" as const,
    label: r.title,
    sub: r.client.name,
    at: r.createdAt,
  }));
  const recentPartnershipEvents = recentPartnerships.map(p => ({
    id: p.id, type: "partnership" as const,
    label: `${p.inviter.name} → ${p.invitee.name}`,
    sub: p.status,
    at: p.createdAt,
  }));
  const activityFeed = [...recentUsers, ...recentReportEvents, ...recentPartnershipEvents]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 15);

  const statCards = [
    { label: "Manager users", value: totalUsers, icon: Users, color: "text-primary" },
    { label: "Client accounts", value: clientCount, icon: UserCheck, color: "text-blue-500" },
    { label: "Messages this week", value: messagesThisWeek, icon: MessageSquare, color: "text-green-500" },
    { label: "Active partnerships", value: pAccepted, icon: Zap, color: "text-amber-500" },
    { label: "Reports generated", value: reportCount, icon: FileText, color: "text-purple-500" },
    { label: "Push subscriptions", value: pushSubCount, icon: Bell, color: "text-pink-500" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your app at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Signups + Retention + Partnership funnel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Signups — last 30 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SignupsChart data={signupData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" /> Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RetentionBars dau={dau} wau={wau} total={totalUsers} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Partnership funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PartnershipFunnel data={funnelData} />
          </CardContent>
        </Card>
      </div>

      {/* Platform health + Activity feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" /> Platform health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Scrape success rate (7d)</span>
              {scrapeRate === null ? (
                <span className="text-muted-foreground text-xs">No data</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  {scrapeRate >= 80
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  <span className="font-semibold">{scrapeRate}%</span>
                  <span className="text-xs text-muted-foreground">({scrapeSuccess}/{scrapeTotal})</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Push coverage (managers)</span>
              <div className="flex items-center gap-1.5">
                {pushCoverage >= 50
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="font-semibold">{pushCoverage}%</span>
                <span className="text-xs text-muted-foreground">({pushSubCount} subscriptions)</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total partnerships</span>
              <span className="font-semibold">{partnershipsAll.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Acceptance rate</span>
              <span className="font-semibold">
                {partnershipsAll.length ? Math.round((pAccepted / partnershipsAll.length) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Activity feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityFeed.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="space-y-2.5">
                {activityFeed.map((e, i) => (
                  <li key={`${e.id}-${i}`} className="flex items-start gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      e.type === "signup" ? "bg-primary" :
                      e.type === "report" ? "bg-purple-500" : "bg-amber-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{e.label}</p>
                      <p className="text-[10px] text-muted-foreground">{e.sub} · {timeAgo(e.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> All users ({allUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Email", "@username", "Role", "Joined", "Last active", "Push"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap max-w-[140px] truncate">{u.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap max-w-[180px] truncate">{u.email}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {u.username ? `@${u.username}` : <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${roleColor(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{timeAgo(u.createdAt)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {u.lastActiveAt
                        ? <span className={u.lastActiveAt >= weekAgo ? "text-green-500" : ""}>{timeAgo(u.lastActiveAt)}</span>
                        : <span className="opacity-30">Never</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {u._count.pushSubscriptions > 0
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        : <XCircle className="w-3.5 h-3.5 text-muted-foreground/30" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
