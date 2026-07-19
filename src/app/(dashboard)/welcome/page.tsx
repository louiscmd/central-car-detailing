"use client";

import { useState, useEffect } from "react";
import { Plus, RotateCcw, CheckSquare, Star, BookmarkCheck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

// ─── Currency ─────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "EUR (€)", suffix: false },
  { code: "USD", symbol: "$", label: "USD ($)", suffix: false },
  { code: "GBP", symbol: "£", label: "GBP (£)", suffix: false },
  { code: "PLN", symbol: "zł", label: "PLN (zł)", suffix: true },
] as const;
type CurrencyCode = typeof CURRENCIES[number]["code"];

function fmtCash(n: number, code: CurrencyCode) {
  const c = CURRENCIES.find((x) => x.code === code)!;
  const num = Math.round(n).toLocaleString();
  return c.suffix ? `${num} ${c.symbol}` : `${c.symbol}${num}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const W_ITEMS = [
  { id: "workout", label: "Worked out" },
  { id: "focus",   label: "2 focused hours of work" },
  { id: "clean",   label: "Ate clean" },
];

// ─── Storage keys ─────────────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function cashKey() {
  const d = new Date();
  return `cash-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function historyKey(year: number) {
  return `revenue-history-${year}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BizHubPage() {
  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const [mounted,  setMounted]  = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");
  const [cashTotal, setCashTotal] = useState(0);
  const [input,    setInput]    = useState("");
  const [checks,   setChecks]   = useState({ workout: false, focus: false, clean: false });
  const [history,  setHistory]  = useState<number[]>(Array(12).fill(0));
  const [flash,    setFlash]    = useState(false);

  useEffect(() => {
    setMounted(true);
    const cur = localStorage.getItem("bizhub-currency") as CurrencyCode | null;
    if (cur && CURRENCIES.find((c) => c.code === cur)) setCurrency(cur);
    const cash = localStorage.getItem(cashKey());
    if (cash) setCashTotal(parseFloat(cash));
    const ch = localStorage.getItem(`w-day-${todayKey()}`);
    if (ch) setChecks(JSON.parse(ch));
    const hist = localStorage.getItem(historyKey(currentYear));
    if (hist) setHistory(JSON.parse(hist));
  }, [currentYear]);

  function changeCurrency(code: CurrencyCode) {
    setCurrency(code);
    localStorage.setItem("bizhub-currency", code);
  }

  function addCash() {
    const amt = parseFloat(input.replace(",", "."));
    if (isNaN(amt) || amt <= 0) return;
    const next = cashTotal + amt;
    setCashTotal(next);
    localStorage.setItem(cashKey(), String(next));
    setInput("");
  }

  function resetCash() {
    setCashTotal(0);
    localStorage.setItem(cashKey(), "0");
  }

  function saveMonth() {
    const updated = [...history];
    updated[currentMonth] = cashTotal;
    setHistory(updated);
    localStorage.setItem(historyKey(currentYear), JSON.stringify(updated));
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  }

  function toggleCheck(id: keyof typeof checks) {
    const updated = { ...checks, [id]: !checks[id] };
    setChecks(updated);
    localStorage.setItem(`w-day-${todayKey()}`, JSON.stringify(updated));
  }

  const allChecked = W_ITEMS.every((item) => checks[item.id as keyof typeof checks]);
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });
  const fmt = (n: number) => fmtCash(n, currency);

  const chartData = MONTHS.map((month, i) => ({
    month,
    revenue: history[i] ?? 0,
    current: i === currentMonth,
  }));

  if (!mounted) return null;

  return (
    <div className="flex flex-col items-center min-h-full py-10">
      <div className="w-full max-w-5xl space-y-8 px-2">

        {/* Header + currency picker */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Biz Hub</h1>
            <p className="text-muted-foreground mt-1 text-sm">Your personal daily hub.</p>
          </div>
          <select
            value={currency}
            onChange={(e) => changeCurrency(e.target.value as CurrencyCode)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Cash collected this month */}
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-7">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cash collected</h2>
                <span className="text-sm text-muted-foreground">{monthLabel}</span>
              </div>

              <div className="text-6xl font-bold tracking-tight tabular-nums leading-none">
                {fmt(cashTotal)}
              </div>

              <div className="flex gap-2">
                <input
                  type="number" min="0" value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCash()}
                  placeholder="Add amount…"
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={addCash}
                  className="px-5 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => { if (window.confirm(`Reset to ${fmt(0)}?`)) resetCash(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
                  <RotateCcw className="w-3 h-3" /> Reset month
                </button>
                <button onClick={saveMonth}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    flash
                      ? "bg-green-500/15 text-green-500"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}>
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  {flash ? "Saved!" : "Save to history"}
                </button>
              </div>
            </div>

            {/* Monthly revenue bar chart */}
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Revenue {currentYear}</h2>
                <span className="text-xs text-muted-foreground">Save each month to build history</span>
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                    width={38}
                  />
                  <Tooltip
                    formatter={(v: number) => [fmt(v), "Revenue"]}
                    cursor={{ fill: "hsl(var(--accent))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.current
                          ? "hsl(var(--primary))"
                          : entry.revenue > 0
                            ? "hsl(var(--primary) / 0.5)"
                            : "hsl(var(--border))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <p className="text-xs text-muted-foreground">
                Bright bar = current month. Hit <span className="text-primary font-medium">Save to history</span> above to record it.
              </p>
            </div>

          </div>

          {/* ── W DAY CHECKLIST ──────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-7">
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">W day checklist</h2>
            </div>

            <div className="space-y-5">
              {W_ITEMS.map((item, i) => {
                const checked = checks[item.id as keyof typeof checks];
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleCheck(item.id as keyof typeof checks)}
                    className="flex items-center gap-4 w-full text-left group">
                    <div className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      checked ? "bg-primary border-primary" : "border-border group-hover:border-primary/60"
                    }`}>
                      {checked && (
                        <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-base transition-colors select-none ${
                      checked ? "line-through text-muted-foreground" : "text-foreground"
                    }`}>
                      {i + 1}. {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {allChecked && (
              <div className="pt-5 border-t border-border flex items-center gap-2.5 text-amber-400 animate-fade-in">
                <Star className="w-5 h-5 fill-amber-400" />
                <span className="text-base font-bold tracking-wide">W day legend</span>
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
