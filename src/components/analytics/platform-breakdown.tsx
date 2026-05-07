"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { platformColor, platformLabel, formatNumber } from "@/lib/utils";
import type { PlatformBreakdown } from "@/types";

interface PlatformBreakdownChartProps {
  platforms: PlatformBreakdown[];
}

export function PlatformBreakdownChart({ platforms }: PlatformBreakdownChartProps) {
  const pieData = platforms.map((p) => ({
    name: platformLabel(p.platform),
    value: p.followers,
    color: platformColor(p.platform),
  }));

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { color: string } }>;
  }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
        <p className="font-medium" style={{ color: p.payload.color }}>{p.name}</p>
        <p className="text-muted-foreground">{formatNumber(p.value)} followers</p>
      </div>
    );
  };

  if (platforms.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platform Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Add social accounts to see breakdown.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Platform Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
