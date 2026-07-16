"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { PlatformViewsPoint } from "@/lib/analytics";

const PLATFORM_CONFIG = {
  TIKTOK:    { label: "TikTok",    color: "#94a3b8" },
  INSTAGRAM: { label: "Instagram", color: "#e1306c" },
  FACEBOOK:  { label: "Facebook",  color: "#1877f2" },
  YOUTUBE:   { label: "YouTube",   color: "#ff0000" },
} as const;

type PlatformKey = keyof typeof PLATFORM_CONFIG;

interface Props {
  timeline: PlatformViewsPoint[];
  totals: { TIKTOK: number; INSTAGRAM: number; FACEBOOK: number; YOUTUBE: number; total: number };
  height?: number;
}

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

export function PlatformViewsChart({ timeline, totals, height = 180 }: Props) {
  const activePlatforms = (Object.keys(PLATFORM_CONFIG) as PlatformKey[]).filter(
    (p) => totals[p] > 0
  );

  const hasData = totals.total > 0;

  return (
    <div className="space-y-4">
      {/* Per-platform totals */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(PLATFORM_CONFIG) as PlatformKey[]).map((p) => (
          <div key={p} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: PLATFORM_CONFIG[p].color }}
            />
            <span className="text-xs text-muted-foreground">{PLATFORM_CONFIG[p].label}</span>
            <span className="text-xs font-semibold tabular-nums">{fmt(totals[p])}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-xs font-semibold tabular-nums text-primary">{fmt(totals.total)}</span>
        </div>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
          No views data yet — scrape an account to see views
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={fmt}
              width={40}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                PLATFORM_CONFIG[name as PlatformKey]?.label ?? name,
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Legend
              formatter={(value) => PLATFORM_CONFIG[value as PlatformKey]?.label ?? value}
              wrapperStyle={{ fontSize: 11 }}
            />
            {activePlatforms.map((p) => (
              <Area
                key={p}
                type="monotone"
                dataKey={p}
                stroke={PLATFORM_CONFIG[p].color}
                fill={PLATFORM_CONFIG[p].color + "26"}
                strokeWidth={2}
                dot={false}
                stackId="1"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
