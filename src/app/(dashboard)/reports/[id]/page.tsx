"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2, Download, ArrowLeft, TrendingUp, Users, Eye, Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FollowerChart } from "@/components/analytics/follower-chart";
import { EngagementChart } from "@/components/analytics/engagement-chart";
import { PlatformBreakdownChart } from "@/components/analytics/platform-breakdown";
import { PlatformBadge } from "@/components/clients/platform-badge";
import { formatNumber, formatPercent, platformLabel } from "@/lib/utils";
import type { ReportData, Platform } from "@/types";

interface ReportRecord {
  id: string;
  title: string;
  data: ReportData;
  createdAt: string;
  client: { name: string };
}

export default function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then(({ data }) => { setReport(data); setLoading(false); });
  }, [id]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) return <p className="text-muted-foreground">Report not found.</p>;

  const d = report.data;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl" ref={printRef}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{report.title}</h1>
            <p className="text-muted-foreground text-sm">
              Generated {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download / Print
        </Button>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold">{report.title}</h1>
        <p className="text-gray-500">
          {d.period.label} · Generated {new Date(report.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Followers",
            value: formatNumber(d.summary.totalFollowers),
            sub: `+${formatNumber(d.summary.followerGrowth)} this month`,
            icon: Users,
            color: "text-blue-500",
          },
          {
            label: "Monthly Views",
            value: formatNumber(d.summary.totalViews),
            sub: "view growth",
            icon: Eye,
            color: "text-purple-500",
          },
          {
            label: "Avg. Engagement",
            value: `${d.summary.totalEngagement.toFixed(2)}%`,
            sub: "across platforms",
            icon: Heart,
            color: "text-rose-500",
          },
          {
            label: "Posts Published",
            value: formatNumber(d.summary.postsPublished),
            sub: "this month",
            icon: TrendingUp,
            color: "text-emerald-500",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FollowerChart data={d.followerChart} title="Follower Growth" />
        <EngagementChart data={d.viewsChart} title="Views This Month" />
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlatformBreakdownChart platforms={d.platforms} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.platforms.map((p) => (
                <div
                  key={p.platform}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={p.platform as Platform} />
                  </div>
                  <div className="flex gap-6 text-right text-sm">
                    <div>
                      <p className="font-semibold">{formatNumber(p.followers)}</p>
                      <p className="text-xs text-muted-foreground">followers</p>
                    </div>
                    <div>
                      <p className={`font-semibold ${p.followerGrowth >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {p.followerGrowth >= 0 ? "+" : ""}{formatNumber(p.followerGrowth)}
                      </p>
                      <p className="text-xs text-muted-foreground">growth</p>
                    </div>
                    <div>
                      <p className="font-semibold">{p.engagementRate.toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground">engagement</p>
                    </div>
                  </div>
                </div>
              ))}
              {d.platforms.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No platform data available.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Content */}
      {d.topContent.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.topContent.slice(0, 10).map((post, i) => (
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
                      className="w-10 h-10 rounded object-cover bg-muted shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">
                      {post.caption?.slice(0, 70) ?? post.url}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {post.type}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-semibold text-emerald-500">
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

      <p className="text-xs text-muted-foreground text-center pb-4">
        Report generated by SocialPulse · {new Date(d.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
