"use client";

import { useState, useEffect } from "react";
import { Plus, RotateCcw, CheckSquare, Star } from "lucide-react";

const W_ITEMS = [
  { id: "workout", label: "Worked out" },
  { id: "focus", label: "2 focused hours of work" },
  { id: "clean", label: "Ate clean" },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey() {
  const d = new Date();
  return `cash-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function WelcomePage() {
  const [cashTotal, setCashTotal] = useState(0);
  const [input, setInput] = useState("");
  const [checks, setChecks] = useState({ workout: false, focus: false, clean: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedCash = localStorage.getItem(monthKey());
    if (savedCash) setCashTotal(parseFloat(savedCash));

    const savedChecks = localStorage.getItem(`w-day-${todayKey()}`);
    if (savedChecks) setChecks(JSON.parse(savedChecks));
  }, []);

  function addCash() {
    const amount = parseFloat(input.replace(",", "."));
    if (isNaN(amount) || amount <= 0) return;
    const newTotal = cashTotal + amount;
    setCashTotal(newTotal);
    localStorage.setItem(monthKey(), String(newTotal));
    setInput("");
  }

  function resetCash() {
    setCashTotal(0);
    localStorage.setItem(monthKey(), "0");
  }

  function toggleCheck(id: keyof typeof checks) {
    const updated = { ...checks, [id]: !checks[id] };
    setChecks(updated);
    localStorage.setItem(`w-day-${todayKey()}`, JSON.stringify(updated));
  }

  const allChecked = W_ITEMS.every((item) => checks[item.id as keyof typeof checks]);
  const monthLabel = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your personal daily hub.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Cash collected ───────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Cash collected</h2>
            <span className="text-xs text-muted-foreground">{monthLabel}</span>
          </div>

          <div className="text-5xl font-bold tracking-tight tabular-nums">
            €{cashTotal.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCash()}
              placeholder="Add amount…"
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={addCash}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <button
            onClick={() => { if (window.confirm("Reset cash to €0?")) resetCash(); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors w-fit">
            <RotateCcw className="w-3 h-3" /> Reset month
          </button>
        </div>

        {/* ── W Day Checklist ──────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">W day checklist</h2>
          </div>

          <div className="space-y-3.5">
            {W_ITEMS.map((item, i) => {
              const checked = checks[item.id as keyof typeof checks];
              return (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id as keyof typeof checks)}
                  className="flex items-center gap-3 w-full text-left group">
                  <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    checked ? "bg-primary border-primary" : "border-border group-hover:border-primary/60"
                  }`}>
                    {checked && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm transition-colors select-none ${
                    checked ? "line-through text-muted-foreground" : "text-foreground"
                  }`}>
                    {i + 1}. {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {allChecked && (
            <div className="pt-4 border-t border-border flex items-center gap-2 text-amber-400 animate-fade-in">
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="text-sm font-bold tracking-wide">W day legend</span>
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
