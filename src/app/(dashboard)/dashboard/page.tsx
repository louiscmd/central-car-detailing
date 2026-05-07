import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardStats } from "@/lib/analytics";
import { formatNumber, formatDate, platformLabel } from "@/lib/utils";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Eye, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PlatformBadge } from "@/components/clients/platform-badge";
import type { Platform } from "@/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [stats, recentClients] = await Promise.all([
    getDashboardStats(userId),
    prisma.client.findMany({
      where: { userId },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        accounts: {
          select: {
            platform: true,
            lastScraped: true,
            snapshots: {
              orderBy: { date: "desc" },
              take: 1,
              select: { followers: true },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of all your clients and social accounts.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Clients"
          value={stats.totalClients}
          icon={Users}
          subtitle={`${stats.activeClients} active`}
        />
        <StatsCard
          title="Social Accounts"
          value={stats.totalAccounts}
          icon={Activity}
          iconColor="text-emerald-500"
        />
        <StatsCard
          title="Total Followers"
          value={stats.totalFollowers}
          icon={TrendingUp}
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Snapshots Today"
          value={stats.recentSnapshots}
          icon={Eye}
          iconColor="text-amber-500"
          subtitle="Last 24 hours"
        />
      </div>

      {/* Recent clients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Clients</CardTitle>
          <Link
            href="/clients"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No clients yet.</p>
              <Link href="/clients" className="text-primary text-sm hover:underline mt-1 inline-block">
                Add your first client →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentClients.map((client) => {
                const totalFollowers = client.accounts.reduce((sum, a) => {
                  const f = a.snapshots[0]?.followers;
                  return sum + (f ? Number(f) : 0);
                }, 0);

                return (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">
                        {client.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                          {client.name}
                        </p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {client.accounts.map((a) => (
                            <PlatformBadge
                              key={a.platform}
                              platform={a.platform as Platform}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatNumber(totalFollowers)}
                      </p>
                      <p className="text-xs text-muted-foreground">followers</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
