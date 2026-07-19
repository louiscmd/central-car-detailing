"use client";

import { useState, useEffect } from "react";
import { Plus, RotateCcw, CheckSquare, Star, BookmarkCheck, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaycheckEntry {
  id: string;
  amount: number;
  description: string;
  date: string; // "2026-07-15"
}

interface MonthRecord {
  total: number;
  paychecks: PaycheckEntry[];
}

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
const MONTH_FULL = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];

const W_ITEMS = [
  { id: "workout", label: "Worked out" },
  { id: "focus",   label: "2 focused hours of work" },
  { id: "clean",   label: "Ate clean" },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function todayKey()   { return new Date().toISOString().slice(0, 10); }
function historyKey(year: number) { return `revenue-history-${year}`; }

function emptyHistory(): MonthRecord[] {
  return Array.from({ length: 12 }, () => ({ total: 0, paychecks: [] }));
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function BizHubPage() {
  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const [mounted,    setMounted]    = useState(false);
  const [currency,   setCurrency]   = useState<CurrencyCode>("EUR");
  const [cashTotal,  setCashTotal]  = useState(0);
  const [amtInput,   setAmtInput]   = useState("");
  const [descInput,  setDescInput]  = useState("");
  const [checks,     setChecks]     = useState({ workout: false, focus: false, clean: false });
  const [history,    setHistory]    = useState<MonthRecord[]>(emptyHistory());
  const [liveChecks, setLiveChecks] = useState<PaycheckEntry[]>([]);
  const [flash,      setFlash]      = useState(false);
  const [selectedBar, setSelectedBar] = useState<number | null>(null); // which bar is selected

  // ── Load from localStorage ────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const cur = localStorage.getItem("bizhub-currency") as CurrencyCode | null;
    if (cur && CURRENCIES.find((c) => c.code === cur)) setCurrency(cur);

    const hist = localStorage.getItem(historyKey(currentYear));
    const loaded: MonthRecord[] = hist ? JSON.parse(hist) : emptyHistory();
    // Ensure 12 slots exist
    while (loaded.length < 12) loaded.push({ total: 0, paychecks: [] });
    setHistory(loaded);

    // Current month's live total is stored inside history's current slot while unsaved
    setCashTotal(loaded[currentMonth]?.total ?? 0);
    setLiveChecks(loaded[currentMonth]?.paychecks ?? []);

    const ch = localStorage.getItem(`w-day-${todayKey()}`);
    if (ch) setChecks(JSON.parse(ch));
  }, [currentYear, currentMonth]);

  // ── Persist helpers ───────────────────────────────────────────────────────
  function persistHistory(next: MonthRecord[]) {
    setHistory(next);
    localStorage.setItem(historyKey(currentYear), JSON.stringify(next));
  }

  // ── Currency ──────────────────────────────────────────────────────────────
  function changeCurrency(code: CurrencyCode) {
    setCurrency(code);
    localStorage.setItem("bizhub-currency", code);
  }

  // ── Add paycheck ──────────────────────────────────────────────────────────
  function addPaycheck() {
    const amt = parseFloat(amtInput.replace(",", "."));
    if (isNaN(amt) || amt <= 0 || !descInput.trim()) return;

    const entry: PaycheckEntry = {
      id: crypto.randomUUID(),
      amount: amt,
      description: descInput.trim(),
      date: todayKey(),
    };

    const newTotal     = cashTotal + amt;
    const newPaychecks = [...liveChecks, entry];

    setCashTotal(newTotal);
    setLiveChecks(newPaychecks);
    setAmtInput("");
    setDescInput("");

    // Immediately persist to current month slot
    const next = [...history];
    next[currentMonth] = { total: newTotal, paychecks: newPaychecks };
    persistHistory(next);
  }

  // ── Reset current month ───────────────────────────────────────────────────
  function resetMonth() {
    setCashTotal(0);
    setLiveChecks([]);
    const next = [...history];
    next[currentMonth] = { total: 0, paychecks: [] };
    persistHistory(next);
  }

  // ── Save month (lock it in, start fresh) ─────────────────────────────────
  // In this design, data is already saved continuously.
  // "Save to history" just triggers the flash — data is always live-synced.
  function saveMonth() {
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  }

  // ── W day checklist ───────────────────────────────────────────────────────
  function toggleCheck(id: keyof typeof checks) {
    const updated = { ...checks, [id]: !checks[id] };
    setChecks(updated);
    localStorage.setItem(`w-day-${todayKey()}`, JSON.stringify(updated));
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const allChecked  = W_ITEMS.every((item) => checks[item.id as keyof typeof checks]);
  const monthLabel  = now.toLocaleString("default", { month: "long", year: "numeric" });
  const fmt         = (n: number) => fmtCash(n, currency);

  // Which month to show in paycheck history panel
  const viewMonth   = selectedBar !== null ? selectedBar : currentMonth;
  const viewRecord  = history[viewMonth] ?? { total: 0, paychecks: [] };
  const viewLabel   = `${MONTH_FULL[viewMonth]} ${currentYear}`;
  const isViewingCurrent = viewMonth === currentMonth;

  const chartData = MONTHS.map((month, i) => ({
    month,
    revenue: history[i]?.total ?? 0,
    current: i === currentMonth,
    selected: i === selectedBar,
  }));

  if (!mounted) return null;

  return (
    <div className="flex flex-col items-center min-h-full py-10">
      <div className="w-full max-w-5xl space-y-8 px-2">

        {/* ── Header + currency ─────────────────────────────────── */}
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

          {/* ═══ LEFT COLUMN ════════════════════════════════════ */}
          <div className="flex flex-col gap-6">

            {/* Cash collected */}
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cash collected</h2>
                <span className="text-sm text-muted-foreground">{monthLabel}</span>
              </div>

              <div className="text-6xl font-bold tracking-tight tabular-nums leading-none">
                {fmt(cashTotal)}
              </div>

              {/* Add paycheck form */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="number" min="0" value={amtInput}
                    onChange={(e) => setAmtInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && descInput.trim() && addPaycheck()}
                    placeholder="Amount…"
                    className="w-32 shrink-0 bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text" value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && amtInput && addPaycheck()}
                    placeholder="For what?"
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={addPaycheck}
                  disabled={!amtInput || !descInput.trim()}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add paycheck
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => { if (window.confirm("Reset this month to 0? Paycheck history will also be cleared.")) resetMonth(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
                  <RotateCcw className="w-3 h-3" /> Reset month
                </button>
                <button onClick={saveMonth}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    flash ? "bg-green-500/15 text-green-500" : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}>
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  {flash ? "Saved!" : "Mark as saved"}
                </button>
              </div>
            </div>

            {/* Monthly revenue bar chart */}
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Revenue {currentYear}</h2>
                <span className="text-xs text-muted-foreground">Click a bar to see history</span>
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                  onClick={(data) => {
                    if (data?.activeTooltipIndex != null) {
                      const idx = data.activeTooltipIndex;
                      setSelectedBar(prev => prev === idx ? null : idx);
                    }
                  }}>
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
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} style={{ cursor: "pointer" }}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.selected
                            ? "hsl(var(--primary))"
                            : entry.current
                              ? "hsl(var(--primary) / 0.8)"
                              : entry.revenue > 0
                                ? "hsl(var(--primary) / 0.4)"
                                : "hsl(var(--border))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* ═══ RIGHT COLUMN ════════════════════════════════════ */}
          <div className="flex flex-col gap-6">

            {/* W day checklist */}
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

            {/* Paycheck history */}
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Paycheck history</h2>
                {selectedBar !== null && (
                  <button
                    onClick={() => setSelectedBar(null)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3 h-3" /> Clear selection
                  </button>
                )}
              </div>

              {/* Month label */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">{viewLabel}</span>
                {isViewingCurrent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">current</span>
                )}
              </div>

              {viewRecord.paychecks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {isViewingCurrent ? "No paychecks yet this month." : "No paychecks recorded for this month."}
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {viewRecord.paychecks.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-background border border-border">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">{entry.date}</p>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0 tabular-nums">
                        +{fmt(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              {viewRecord.paychecks.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-sm font-bold tabular-nums">{fmt(viewRecord.total)}</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
