"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { FollowerChart } from "@/components/analytics/follower-chart";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { PlatformBadge } from "@/components/clients/platform-badge";
import { formatNumber, formatPercent, platformLabel, currentMonthYear, formatMonthYear } from "@/lib/utils";
import { Users, TrendingUp, Eye, Heart } from "lucide-react";
import type { MonthlyAnalytics, Platform } from "@/types";

interface ClientOption {
  id: string;
  name: string;
  accounts: { id: string; platform: Platform; username: string }[];
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const defaultClientId = searchParams.get("clientId") ?? "";

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [analytics, setAnalytics] = useState<MonthlyAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const { month, year } = currentMonthYear();
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedYear, setSelectedYear] = useState(year);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(({ data }) => {
        setClients(data ?? []);
        if (defaultClientId && data?.length) {
          const c = data.find((c: ClientOption) => c.id === defaultClientId);
          if (c?.accounts?.[0]) setSelectedAccountId(c.accounts[0].id);
        } else if (data?.[0]?.accounts?.[0]) {
          setSelectedClientId(data[0].id);
          setSelectedAccountId(data[0].accounts[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    setLoading(true);
    fetch(
      `/api/analytics?accountId=${selectedAccountId}&month=${selectedMonth}&year=${selectedYear}`
    )
      .then((r) => r.json())
      .then(({ data }) => setAnalytics(data))
      .finally(() => setLoading(false));
  }, [selectedAccountId, selectedMonth, selectedYear]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString("default", { month: "long" }),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Monthly performance breakdown per account.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={selectedClientId}
          onValueChange={(v) => {
            setSelectedClientId(v);
            const c = clients.find((c) => c.id === v);
            if (c?.accounts?.[0]) setSelectedAccountId(c.accounts[0].id);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedAccountId}
          onValueChange={setSelectedAccountId}
          disabled={!selectedClient}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {selectedClient?.accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {platformLabel(a.platform)} · @{a.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(selectedMonth)}
          onValueChange={(v) => setSelectedMonth(parseInt(v))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(parseInt(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2025, 2026, 2027].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !analytics ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            {clients.length === 0
              ? "Add a client and social account to see analytics."
              : "Select a client and account to view analytics."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatsCard
              title="Total Followers"
              value={analytics.totalFollowers}
              change={analytics.followerGrowthPercent}
              changeLabel="this month"
              icon={Users}
            />
            <StatsCard
              title="New Followers"
              value={analytics.followerGrowth}
              icon={TrendingUp}
              iconColor="text-emerald-500"
              subtitle="vs last month"
            />
            <StatsCard
              title="Monthly Views"
              value={analytics.totalViews}
              icon={Eye}
              iconColor="text-blue-500"
              subtitle="view growth"
            />
            <StatsCard
              title="Engagement Rate"
              value={`${analytics.engagementRate.toFixed(2)}%`}
              icon={Heart}
              iconColor="text-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FollowerChart
              data={analytics.followersTimeline}
              title="Follower Growth"
            />
            <EngagementChart
              data={analytics.viewsTimeline}
              title="Daily Views Snapshot"
            />
          </div>

          {/* Top Posts */}
          {analytics.topPosts.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4">
                  Top Content — {formatMonthYear(selectedMonth, selectedYear)}
                </h3>
                <div className="space-y-3">
                  {analytics.topPosts.slice(0, 5).map((post, i) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-accent/40"
                    >
                      <span className="text-muted-foreground text-sm font-mono w-5 shrink-0">
                        #{i + 1}
                      </span>
                      {post.thumbnailUrl && (
                        <img
                          src={post.thumbnailUrl}
                          alt=""
                          className="w-12 h-12 rounded object-cover bg-muted shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-muted-foreground">
                          {post.caption
                            ? post.caption.slice(0, 60) + (post.caption.length > 60 ? "…" : "")
                            : post.url}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {post.type}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">
                          +{formatNumber(post.viewGrowthThisMonth)}
                        </p>
                        <p className="text-xs text-muted-foreground">views gained</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
