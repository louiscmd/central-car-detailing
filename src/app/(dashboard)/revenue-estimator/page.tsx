"use client";

import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Users, Info } from "lucide-react";
import { INDUSTRIES, INDUSTRY_CONVERSION_RATES } from "@/lib/territory-data";

interface Client { id: string; name: string; }
interface Estimate {
  industry: string; aov: number; monthlyCustomers: number; profitMargin: number;
  conversionRate: number; followerGrowth: number; reachGrowth: number; engagementGrowth: number;
}
interface Results {
  additionalCustomersLow: number; additionalCustomersMid: number; additionalCustomersHigh: number;
  monthlyRevenueLow: number; monthlyRevenueMid: number; monthlyRevenueHigh: number;
  yearlyRevenueLow: number; yearlyRevenueMid: number; yearlyRevenueHigh: number;
  profitLow: number; profitMid: number; profitHigh: number;
  confidence: "Low" | "Medium" | "High";
  chartData: { month: string; low: number; mid: number; high: number }[];
}

const DEFAULT: Estimate = {
  industry: "restaurant", aov: 80, monthlyCustomers: 200, profitMargin: 0.20,
  conversionRate: 0.02, followerGrowth: 5, reachGrowth: 3, engagementGrowth: 4,
};

function calculate(e: Estimate): Results {
  const growthSignals = [e.followerGrowth > 0, e.reachGrowth > 0, e.engagementGrowth > 0].filter(Boolean).length;
  const confidence: "Low" | "Medium" | "High" = growthSignals === 3 ? "High" : growthSignals >= 1 ? "Medium" : "Low";

  const baseConversion = e.conversionRate;
  const followers = e.monthlyCustomers / baseConversion;
  const monthlyGrowthRate = e.followerGrowth / 100;

  const newFollowers = followers * monthlyGrowthRate;
  const midCustomers = Math.round(newFollowers * baseConversion);
  const lowCustomers = Math.round(midCustomers * 0.6);
  const highCustomers = Math.round(midCustomers * 1.5);

  const monthlyMid = midCustomers * e.aov;
  const monthlyLow = lowCustomers * e.aov;
  const monthlyHigh = highCustomers * e.aov;

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const multiplier = 1 + (i * monthlyGrowthRate * 0.5);
    return {
      month: `M${i + 1}`,
      low: Math.round(monthlyLow * multiplier),
      mid: Math.round(monthlyMid * multiplier),
      high: Math.round(monthlyHigh * multiplier),
    };
  });

  return {
    additionalCustomersLow: lowCustomers,
    additionalCustomersMid: midCustomers,
    additionalCustomersHigh: highCustomers,
    monthlyRevenueLow: monthlyLow,
    monthlyRevenueMid: monthlyMid,
    monthlyRevenueHigh: monthlyHigh,
    yearlyRevenueLow: monthlyLow * 12,
    yearlyRevenueMid: monthlyMid * 12,
    yearlyRevenueHigh: monthlyHigh * 12,
    profitLow: monthlyLow * 12 * e.profitMargin,
    profitMid: monthlyMid * 12 * e.profitMargin,
    profitHigh: monthlyHigh * 12 * e.profitMargin,
    confidence,
    chartData,
  };
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("pl-PL")} PLN`;

const confidenceColor = { Low: "text-yellow-500", Medium: "text-blue-500", High: "text-green-500" };
const confidenceBg = { Low: "bg-yellow-500/10 border-yellow-500/30", Medium: "bg-blue-500/10 border-blue-500/30", High: "bg-green-500/10 border-green-500/30" };

export default function RevenueEstimatorPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [estimate, setEstimate] = useState<Estimate>(DEFAULT);
  const [results, setResults] = useState<Results | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"inputs" | "results">("inputs");

  useEffect(() => {
    fetch("/api/clients").then(r => r.json()).then((data: { data: Client[] }) => {
      setClients(data.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    fetch(`/api/revenue-estimate/${selectedClientId}`).then(r => r.json()).then((data: Estimate | null) => {
      if (data) setEstimate(data);
    });
  }, [selectedClientId]);

  useEffect(() => {
    setResults(calculate(estimate));
  }, [estimate]);

  const handleIndustryChange = useCallback((industry: string) => {
    setEstimate(e => ({
      ...e,
      industry,
      conversionRate: INDUSTRY_CONVERSION_RATES[industry] ?? 0.02,
    }));
  }, []);

  const save = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    await fetch(`/api/revenue-estimate/${selectedClientId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(estimate),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (label: string, key: keyof Estimate, suffix = "", step = 1, min = 0) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number" min={min} step={step}
          value={estimate[key] as number}
          onChange={e => setEstimate(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
          className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue Estimator</h1>
        <p className="text-muted-foreground text-sm mt-1">Demonstrate social media ROI to your clients with data-driven estimates.</p>
      </div>

      {/* Client selector */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedClientId}
          onChange={e => setSelectedClientId(e.target.value)}
          className="flex-1 sm:flex-none min-w-0 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select a client…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {selectedClientId && (
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Saving…" : saved ? "Saved!" : "Save assumptions"}
          </button>
        )}
      </div>

      {/* Mobile tab bar */}
      <div className="flex lg:hidden border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveTab("inputs")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "inputs" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
          Inputs
        </button>
        <button
          onClick={() => setActiveTab("results")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "results" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
          Results
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className={`lg:col-span-1 space-y-4 ${activeTab === "inputs" ? "" : "hidden lg:block"}`}>
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-sm">Business Profile</h2>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Industry</label>
              <select value={estimate.industry} onChange={e => handleIndustryChange(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            {field("Average Order Value", "aov", "PLN")}
            {field("Monthly Customers", "monthlyCustomers", "customers")}
            {field("Profit Margin", "profitMargin", "%", 0.01, 0)}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-sm">Social Growth Metrics</h2>
            {field("Monthly Follower Growth", "followerGrowth", "%/mo")}
            {field("Reach Growth", "reachGrowth", "%/mo")}
            {field("Engagement Growth", "engagementGrowth", "%/mo")}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm">Conversion Rate</h2>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">% of new followers who become customers. Industry default applied automatically.</p>
            {field("Conversion Rate", "conversionRate", "%", 0.001, 0)}
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className={`lg:col-span-2 space-y-4 ${activeTab === "results" ? "" : "hidden lg:block"}`}>
            {/* Confidence badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${confidenceBg[results.confidence]}`}>
              <span className={confidenceColor[results.confidence]}>●</span>
              <span className={confidenceColor[results.confidence]}>{results.confidence} Confidence</span>
            </div>

            {/* Summary text */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <p className="text-sm">Based on your recent growth, social media efforts may be generating approximately <strong>{results.additionalCustomersLow}–{results.additionalCustomersHigh} additional customers per month</strong>.</p>
              <p className="text-sm text-muted-foreground">Estimated additional revenue: <strong className="text-foreground">{fmt(results.monthlyRevenueMid)}/month</strong></p>
              <p className="text-sm text-muted-foreground">Estimated annual revenue impact: <strong className="text-foreground">{fmt(results.yearlyRevenueMid)}/year</strong></p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, label: "Additional Customers/mo", low: results.additionalCustomersLow, mid: results.additionalCustomersMid, high: results.additionalCustomersHigh, suffix: "" },
                { icon: DollarSign, label: "Monthly Revenue Increase", low: results.monthlyRevenueLow, mid: results.monthlyRevenueMid, high: results.monthlyRevenueHigh, suffix: " PLN" },
                { icon: TrendingUp, label: "Annual Revenue Impact", low: results.yearlyRevenueLow, mid: results.yearlyRevenueMid, high: results.yearlyRevenueHigh, suffix: " PLN" },
                { icon: TrendingUp, label: "Annual Profit Increase", low: results.profitLow, mid: results.profitMid, high: results.profitHigh, suffix: " PLN" },
              ].map(({ icon: Icon, label, low, mid, high, suffix }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-xl font-bold">{suffix ? fmt(mid) : mid}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {suffix ? `${fmt(low)} – ${fmt(high)}` : `${low} – ${high}`}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-4">Projected Revenue Impact (12 months)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString("pl-PL")} PLN`]} />
                  <Area type="monotone" dataKey="high" stroke="#22c55e" fill="#22c55e20" name="High" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="mid" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Mid" strokeWidth={2} />
                  <Area type="monotone" dataKey="low" stroke="#f59e0b" fill="#f59e0b20" name="Low" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block" /> High</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" /> Mid</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block" /> Low</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
