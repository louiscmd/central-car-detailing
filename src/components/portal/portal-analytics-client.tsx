"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { FollowerChart } from "@/components/analytics/follower-chart";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { PlatformBadge } from "@/components/clients/platform-badge";
import { formatNumber, formatPercent, platformLabel, currentMonthYear } from "@/lib/utils";
import { Users, TrendingUp, Eye, Heart } from "lucide-react";
import type { MonthlyAnalytics, TimelinePoint, Platform } from "@/types";

interface Account {
  id: string;
  platform: Platform;
  username: string;
  displayName: string | null;
}

export function PortalAnalyticsClient({ accounts }: { accounts: Account[] }) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [analytics, setAnalytics] = useState<(MonthlyAnalytics & { weekViews: TimelinePoint[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const { month, year } = currentMonthYear();
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString("default", { month: "long" }),
  }));

  useEffect(() => {
    if (!selectedAccountId) return;
    setLoading(true);
    fetch(`/api/analytics?accountId=${selectedAccountId}&month=${selectedMonth}&year=${selectedYear}`)
      .then(r => r.json())
      .then(({ data }) => setAnalytics(data as MonthlyAnalytics & { weekViews: TimelinePoint[] }))
      .finally(() => setLoading(false));
  }, [selectedAccountId, selectedMonth, selectedYear]);

  const account = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      {/* Account + month selectors */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                selectedAccountId === acc.id
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <PlatformBadge platform={acc.platform} />
              <span>{platformLabel(acc.platform)}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="text-sm border border-border rounded-lg px-2 py-1.5 bg-card"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-sm border border-border rounded-lg px-2 py-1.5 bg-card"
          >
            {[year - 1, year].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && analytics && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatsCard title="Followers" value={formatNumber(analytics.totalFollowers ?? 0)} icon={Users} />
            <StatsCard title="Engagement" value={formatPercent(analytics.engagementRate ?? 0)} icon={Heart} />
            <StatsCard title="Views" value={formatNumber(analytics.totalViews ?? 0)} icon={Eye} />
            <StatsCard title="Follower Growth" value={formatNumber(analytics.followerGrowth ?? 0)} icon={TrendingUp} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FollowerChart data={analytics.followersTimeline ?? []} />
            <EngagementChart data={analytics.engagementTimeline ?? []} />
          </div>
        </>
      )}

      {!loading && !analytics && (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          No data for {account ? platformLabel(account.platform) : "this account"} in {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
        </div>
      )}
    </div>
  );
}
