"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell,
} from "recharts";

interface SignupDay { date: string; count: number; }
interface FunnelItem { name: string; value: number; fill: string; }

export function SignupsChart({ data }: { data: SignupDay[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          interval={6}
        />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
          cursor={{ fill: "hsl(var(--accent))" }}
        />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Signups" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PartnershipFunnel({ data }: { data: FunnelItem[] }) {
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-semibold">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${data[0].value ? Math.round((item.value / data[0].value) * 100) : 0}%`,
                background: item.fill,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RetentionBars({ dau, wau, total }: { dau: number; wau: number; total: number }) {
  const data = [
    { label: "Active today (DAU)", value: dau, pct: total ? Math.round((dau / total) * 100) : 0, color: "hsl(var(--primary))" },
    { label: "Active this week (WAU)", value: wau, pct: total ? Math.round((wau / total) * 100) : 0, color: "hsl(142, 71%, 45%)" },
    { label: "Dormant 7+ days", value: total - wau, pct: total ? Math.round(((total - wau) / total) * 100) : 0, color: "hsl(var(--muted-foreground))" },
  ];
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-semibold">{d.value} <span className="text-muted-foreground font-normal">({d.pct}%)</span></span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, background: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
