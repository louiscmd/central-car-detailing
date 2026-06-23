"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Plus, Edit2, Check, X, TrendingUp, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { METRO_AREAS, BUSINESS_CATEGORIES } from "@/lib/territory-data";

interface TerritoryEntry {
  id: string; city: string; metro: string; category: string;
  totalBusinesses: number; contacted: number; meetings: number;
  activeLeads: number; clientsWon: number; mrr: number; notes?: string;
}

interface EditingEntry extends Omit<TerritoryEntry, "id"> { id?: string; }

const CATEGORIES = BUSINESS_CATEGORIES;

function penetration(contacted: number, total: number) {
  if (!total) return 0;
  return Math.round((contacted / total) * 100);
}

function ProgressBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

function EntryModal({ entry, onSave, onClose }: {
  entry: EditingEntry; onSave: (e: EditingEntry) => void; onClose: () => void;
}) {
  const [form, setForm] = useState(entry);
  const set = (k: keyof EditingEntry, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{form.city} — {CATEGORIES.find(c => c.value === form.category)?.label}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {([
            ["Total Businesses", "totalBusinesses"],
            ["Contacted", "contacted"],
            ["Meetings", "meetings"],
            ["Active Leads", "activeLeads"],
            ["Clients Won", "clientsWon"],
            ["MRR (PLN)", "mrr"],
          ] as [string, keyof EditingEntry][]).map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs text-muted-foreground mb-1">{label}</label>
              <input type="number" min={0} value={form[key] as number}
                onChange={e => set(key, parseFloat(e.target.value) || 0)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Notes</label>
          <textarea rows={2} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function TerritoryPage() {
  const [entries, setEntries] = useState<TerritoryEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("restaurant");
  const [selectedMetro, setSelectedMetro] = useState<string | null>(null);
  const [expandedMetros, setExpandedMetros] = useState<Set<string>>(new Set(["Warsaw"]));
  const [editing, setEditing] = useState<EditingEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/territory").then(r => r.json()).then((data: TerritoryEntry[]) => {
      setEntries(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const getEntry = useCallback((city: string) =>
    entries.find(e => e.city === city && e.category === selectedCategory), [entries, selectedCategory]);

  const openEdit = useCallback((city: string, metro: string) => {
    const existing = entries.find(e => e.city === city && e.category === selectedCategory);
    setEditing(existing ?? {
      city, metro, category: selectedCategory,
      totalBusinesses: 0, contacted: 0, meetings: 0, activeLeads: 0, clientsWon: 0, mrr: 0,
    });
  }, [entries, selectedCategory]);

  const saveEntry = async (form: EditingEntry) => {
    const res = await fetch("/api/territory", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const saved: TerritoryEntry = await res.json();
    setEntries(prev => {
      const idx = prev.findIndex(e => e.city === saved.city && e.category === saved.category);
      return idx >= 0 ? prev.map((e, i) => i === idx ? saved : e) : [...prev, saved];
    });
    setEditing(null);
  };

  const toggleMetro = (metro: string) => {
    setExpandedMetros(prev => {
      const next = new Set(prev);
      next.has(metro) ? next.delete(metro) : next.add(metro);
      return next;
    });
  };

  // Aggregate stats
  const totalMRR = entries.filter(e => e.category === selectedCategory).reduce((s, e) => s + e.mrr, 0);
  const totalClients = entries.filter(e => e.category === selectedCategory).reduce((s, e) => s + e.clientsWon, 0);
  const totalContacted = entries.filter(e => e.category === selectedCategory).reduce((s, e) => s + e.contacted, 0);
  const totalBusinesses = entries.filter(e => e.category === selectedCategory).reduce((s, e) => s + e.totalBusinesses, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Territory Tracker</h1>
        <p className="text-muted-foreground text-sm mt-1">Track market penetration city-by-city across Poland.</p>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setSelectedCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedCategory === c.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total MRR", value: `${Math.round(totalMRR).toLocaleString("pl-PL")} PLN`, icon: TrendingUp },
          { label: "Clients Won", value: totalClients, icon: Check },
          { label: "Contacted", value: totalContacted, icon: Building2 },
          { label: "Market Penetration", value: `${penetration(totalContacted, totalBusinesses)}%`, icon: MapPin },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* City list by metro */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : (
        <div className="space-y-3">
          {Object.entries(METRO_AREAS).map(([metro, cities]) => {
            const metroEntries = entries.filter(e => e.metro === metro && e.category === selectedCategory);
            const metroPenetration = metroEntries.length
              ? penetration(metroEntries.reduce((s, e) => s + e.contacted, 0), metroEntries.reduce((s, e) => s + e.totalBusinesses, 0))
              : 0;
            const metroMRR = metroEntries.reduce((s, e) => s + e.mrr, 0);
            const expanded = expandedMetros.has(metro);

            return (
              <div key={metro} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => toggleMetro(metro)}
                >
                  {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium flex-1">{metro}</span>
                  <span className="text-xs text-muted-foreground">{cities.length} cities</span>
                  {metroMRR > 0 && <span className="text-xs font-medium text-green-500">{Math.round(metroMRR).toLocaleString("pl-PL")} PLN MRR</span>}
                  {metroPenetration > 0 && (
                    <span className={`text-xs font-medium ${metroPenetration >= 50 ? "text-red-500" : metroPenetration >= 20 ? "text-amber-500" : "text-green-500"}`}>
                      {metroPenetration}% penetrated
                    </span>
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {cities.map(city => {
                      const entry = getEntry(city);
                      const pct = entry ? penetration(entry.contacted, entry.totalBusinesses) : 0;
                      const saturation = pct >= 70 ? "Saturated" : pct >= 30 ? "Active" : entry?.contacted ? "Starting" : "Opportunity";
                      const satColor = pct >= 70 ? "text-red-500" : pct >= 30 ? "text-amber-500" : entry?.contacted ? "text-blue-500" : "text-green-500";

                      return (
                        <div key={city} className="px-4 py-3 flex items-center gap-4">
                          <div className="w-32 shrink-0">
                            <p className="text-sm font-medium">{city}</p>
                            <p className={`text-xs ${satColor}`}>{saturation}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            {entry?.totalBusinesses ? (
                              <ProgressBar value={entry.contacted} max={entry.totalBusinesses} />
                            ) : (
                              <div className="h-1.5 bg-muted rounded-full" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                            {entry ? (
                              <>
                                <span>{entry.contacted}/{entry.totalBusinesses} contacted</span>
                                <span className="text-green-500 font-medium">{entry.clientsWon} clients</span>
                                {entry.mrr > 0 && <span>{Math.round(entry.mrr).toLocaleString("pl-PL")} PLN</span>}
                              </>
                            ) : (
                              <span className="text-muted-foreground/50">No data</span>
                            )}
                          </div>
                          <button onClick={() => openEdit(city, metro)}
                            className="p-1.5 rounded-md hover:bg-accent transition-colors shrink-0">
                            {entry ? <Edit2 className="w-3.5 h-3.5 text-muted-foreground" /> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && <EntryModal entry={editing} onSave={saveEntry} onClose={() => setEditing(null)} />}
    </div>
  );
}
