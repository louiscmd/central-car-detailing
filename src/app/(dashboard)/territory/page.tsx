"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Plus, Edit2, X, TrendingUp, Building2, ChevronDown, ChevronRight, Settings, Check, Trash2, Search } from "lucide-react";
import { METRO_AREAS, BUSINESS_CATEGORIES, ALL_CITIES } from "@/lib/territory-data";

interface TerritoryEntry {
  id: string; city: string; metro: string; category: string;
  totalBusinesses: number; contacted: number; meetings: number;
  activeLeads: number; clientsWon: number; mrr: number; notes?: string;
}
interface EditingEntry extends Omit<TerritoryEntry, "id"> { id?: string; }
interface CustomMetro { name: string; cities: string[]; }
interface TerritorySettings {
  country: string;
  activeCategories: string[];
  excludedCities: string[];
  customMetros: CustomMetro[];
}

const COUNTRIES = ["Poland", "Germany", "France", "Spain", "Italy", "UK", "Netherlands", "Czech Republic", "Slovakia", "Hungary", "Romania", "Ukraine", "Other"];

const DEFAULT_SETTINGS: TerritorySettings = { country: "Poland", activeCategories: [], excludedCities: [], customMetros: [] };

function penetration(contacted: number, total: number) {
  if (!total) return 0;
  return Math.round((contacted / total) * 100);
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

function EntryModal({ entry, allCategories, onSave, onClose }: {
  entry: EditingEntry;
  allCategories: { value: string; label: string }[];
  onSave: (e: EditingEntry) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(entry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const setNum = (k: keyof EditingEntry, v: string) => {
    const n = v === "" ? 0 : Number(v);
    if (!isNaN(n)) setForm(f => ({ ...f, [k]: n }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{form.city} — {allCategories.find(c => c.value === form.category)?.label}</h2>
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
                onChange={e => setNum(key, e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Notes</label>
          <textarea rows={2} value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ settings, onSave, onClose }: {
  settings: TerritorySettings;
  onSave: (s: TerritorySettings) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TerritorySettings>(settings);
  const [newMetroName, setNewMetroName] = useState("");
  const [newCityInput, setNewCityInput] = useState<Record<string, string>>({});
  const [cityDropdownOpen, setCityDropdownOpen] = useState<string | null>(null);
  const [editingMetro, setEditingMetro] = useState<string | null>(null);

  const toggleCategory = (val: string) => {
    setForm(f => ({
      ...f,
      activeCategories: f.activeCategories.includes(val)
        ? f.activeCategories.filter(c => c !== val)
        : [...f.activeCategories, val],
    }));
  };

  const addMetro = () => {
    const name = newMetroName.trim();
    if (!name || form.customMetros.find(m => m.name === name)) return;
    setForm(f => ({ ...f, customMetros: [...f.customMetros, { name, cities: [] }] }));
    setNewMetroName("");
  };

  const removeMetro = (name: string) => {
    setForm(f => ({ ...f, customMetros: f.customMetros.filter(m => m.name !== name) }));
  };

  const addCity = (metroName: string, cityOverride?: string) => {
    const city = (cityOverride ?? newCityInput[metroName] ?? "").trim();
    if (!city) return;
    setForm(f => ({
      ...f,
      customMetros: f.customMetros.map(m =>
        m.name === metroName && !m.cities.includes(city)
          ? { ...m, cities: [...m.cities, city] }
          : m
      ),
    }));
    setNewCityInput(prev => ({ ...prev, [metroName]: "" }));
    setCityDropdownOpen(null);
  };

  const removeCity = (metroName: string, city: string) => {
    setForm(f => ({
      ...f,
      customMetros: f.customMetros.map(m =>
        m.name === metroName ? { ...m, cities: m.cities.filter(c => c !== city) } : m
      ),
    }));
  };

  const allSelected = form.activeCategories.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Territory Settings</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Country</label>
          <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {form.country !== "Poland" && (
            <p className="text-xs text-muted-foreground">Polish cities are hidden. Add your own metro areas and cities below.</p>
          )}
        </div>

        {/* Business categories */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Business Categories to Track</label>
            <button onClick={() => setForm(f => ({ ...f, activeCategories: [] }))}
              className="text-xs text-muted-foreground hover:text-foreground">
              {allSelected ? "All selected" : "Select all"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_CATEGORIES.map(cat => {
              const active = allSelected || form.activeCategories.includes(cat.value);
              return (
                <button key={cat.value} onClick={() => toggleCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}>
                  {active && <Check className="w-3 h-3" />}
                  {cat.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Leave all unselected to show every category.</p>
        </div>

        {/* Built-in Polish cities (shown when country = Poland) */}
        {form.country === "Poland" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Polish Cities</label>
              <p className="text-xs text-muted-foreground mt-0.5">Click × to hide a city from your tracker. Click it again to restore.</p>
            </div>
            {Object.entries(METRO_AREAS).map(([metro, cities]) => {
              const allExcluded = cities.every(c => form.excludedCities.includes(c));
              return (
                <div key={metro} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                    <span className="text-sm font-medium flex-1">{metro}</span>
                    <button
                      onClick={() => setForm(f => ({
                        ...f,
                        excludedCities: allExcluded
                          ? f.excludedCities.filter(c => !cities.includes(c))
                          : [...new Set([...f.excludedCities, ...cities])],
                      }))}
                      className="text-xs text-muted-foreground hover:text-foreground">
                      {allExcluded ? "Restore all" : "Hide all"}
                    </button>
                  </div>
                  <div className="p-2 flex flex-wrap gap-1.5">
                    {cities.map(city => {
                      const excluded = form.excludedCities.includes(city);
                      return (
                        <span key={city}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                            excluded
                              ? "bg-muted/30 text-muted-foreground border-border line-through"
                              : "bg-muted text-foreground border-transparent"
                          }`}>
                          {city}
                          <button
                            onClick={() => setForm(f => ({
                              ...f,
                              excludedCities: excluded
                                ? f.excludedCities.filter(c => c !== city)
                                : [...f.excludedCities, city],
                            }))}
                            className="hover:text-primary">
                            {excluded ? <Plus className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom metros & cities */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">Custom Metro Areas & Cities</label>
          <p className="text-xs text-muted-foreground">Add metro areas and cities not in the built-in list.</p>

          {form.customMetros.map(metro => (
            <div key={metro.name} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <button onClick={() => setEditingMetro(editingMetro === metro.name ? null : metro.name)}>
                  {editingMetro === metro.name
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <span className="text-sm font-medium flex-1">{metro.name}</span>
                <span className="text-xs text-muted-foreground">{metro.cities.length} cities</span>
                <button onClick={() => removeMetro(metro.name)}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
              {editingMetro === metro.name && (
                <div className="p-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {metro.cities.map(city => (
                      <span key={city} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-xs">
                        {city}
                        <button onClick={() => removeCity(metro.name, city)}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {/* City picker */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          placeholder="Search or type a city…"
                          value={newCityInput[metro.name] ?? ""}
                          onChange={e => {
                            setNewCityInput(prev => ({ ...prev, [metro.name]: e.target.value }));
                            setCityDropdownOpen(metro.name);
                          }}
                          onFocus={() => setCityDropdownOpen(metro.name)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { addCity(metro.name); e.preventDefault(); }
                            if (e.key === "Escape") setCityDropdownOpen(null);
                          }}
                          className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <button onClick={() => addCity(metro.name)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm shrink-0">
                        Add
                      </button>
                    </div>
                    {/* Dropdown suggestions */}
                    {cityDropdownOpen === metro.name && (() => {
                      const q = (newCityInput[metro.name] ?? "").toLowerCase();
                      const suggestions = (form.country === "Poland" ? ALL_CITIES : [])
                        .filter(c => !metro.cities.includes(c.name) && !form.excludedCities.includes(c.name) && (q === "" || c.name.toLowerCase().includes(q)))
                        .slice(0, 8);
                      return suggestions.length > 0 ? (
                        <div className="absolute z-10 top-full left-0 right-10 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                          {suggestions.map(c => (
                            <button key={c.name}
                              onMouseDown={e => { e.preventDefault(); addCity(metro.name, c.name); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between">
                              <span>{c.name}</span>
                              <span className="text-xs text-muted-foreground">{c.metro}</span>
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <input
              placeholder="New metro area name…"
              value={newMetroName}
              onChange={e => setNewMetroName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addMetro()}
              className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={addMetro}
              className="px-3 py-1.5 border border-border rounded-md text-sm hover:bg-accent flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Metro
            </button>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">Save Settings</button>
        </div>
      </div>
    </div>
  );
}

export default function TerritoryPage() {
  const [entries, setEntries] = useState<TerritoryEntry[]>([]);
  const [settings, setSettings] = useState<TerritorySettings>(DEFAULT_SETTINGS);
  const [selectedCategory, setSelectedCategory] = useState("restaurant");
  const [expandedMetros, setExpandedMetros] = useState<Set<string>>(new Set(["Warsaw"]));
  const [editing, setEditing] = useState<EditingEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/territory").then(r => r.json()),
      fetch("/api/territory/settings").then(r => r.json()),
    ]).then(([entriesData, settingsData]: [TerritoryEntry[], TerritorySettings | null]) => {
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      if (settingsData) setSettings(settingsData);
      setLoading(false);
    });
  }, []);

  // Categories visible to this user (empty activeCategories = all)
  const visibleCategories = settings.activeCategories.length === 0
    ? BUSINESS_CATEGORIES
    : BUSINESS_CATEGORIES.filter(c => settings.activeCategories.includes(c.value));

  // Metro areas to display
  const builtInMetros = settings.country === "Poland"
    ? Object.fromEntries(
        Object.entries(METRO_AREAS)
          .map(([metro, cities]) => [metro, cities.filter(c => !settings.excludedCities.includes(c))] as const)
          .filter(([, cities]) => cities.length > 0)
      )
    : {};
  const customMetrosMap: Record<string, string[]> = Object.fromEntries(
    settings.customMetros.map(m => [m.name, m.cities])
  );
  const allMetros = { ...builtInMetros, ...customMetrosMap };

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
    if (!res.ok) throw new Error(await res.text());
    const saved: TerritoryEntry = await res.json();
    setEntries(prev => {
      const idx = prev.findIndex(e => e.city === saved.city && e.category === saved.category);
      return idx >= 0 ? prev.map((e, i) => i === idx ? saved : e) : [...prev, saved];
    });
    setEditing(null);
  };

  const saveSettings = async (newSettings: TerritorySettings) => {
    await fetch("/api/territory/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSettings),
    });
    setSettings(newSettings);
    // Reset category selection if current one is no longer visible
    const cats = newSettings.activeCategories.length === 0
      ? BUSINESS_CATEGORIES
      : BUSINESS_CATEGORIES.filter(c => newSettings.activeCategories.includes(c.value));
    if (!cats.find(c => c.value === selectedCategory)) setSelectedCategory(cats[0]?.value ?? "restaurant");
    setShowSettings(false);
  };

  const toggleMetro = (metro: string) => {
    setExpandedMetros(prev => {
      const next = new Set(prev);
      next.has(metro) ? next.delete(metro) : next.add(metro);
      return next;
    });
  };

  const totalMRR = entries.filter(e => e.category === selectedCategory).reduce((s, e) => s + e.mrr, 0);
  const totalClients = entries.filter(e => e.category === selectedCategory).reduce((s, e) => s + e.clientsWon, 0);
  const totalContacted = entries.filter(e => e.category === selectedCategory).reduce((s, e) => s + e.contacted, 0);
  const totalBusinesses = entries.filter(e => e.category === selectedCategory).reduce((s, e) => s + e.totalBusinesses, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Territory Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track market penetration city-by-city
            {settings.country !== "Poland" ? ` — ${settings.country}` : " across Poland"}.
          </p>
        </div>
        <button onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">
          <Settings className="w-4 h-4" />
          Customize
        </button>
      </div>

      {/* City search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search cities…"
          value={citySearch}
          onChange={e => setCitySearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {citySearch && (
          <button onClick={() => setCitySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {visibleCategories.map(c => (
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

      {/* City list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : Object.keys(allMetros).length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No cities configured</p>
          <p className="text-xs text-muted-foreground mt-1">Click <strong>Customize</strong> to add metro areas and cities.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(allMetros).map(([metro, cities]) => {
            const q = citySearch.toLowerCase();
            const filteredCities = q
              ? cities.filter(c => c.toLowerCase().includes(q))
              : cities;
            if (q && filteredCities.length === 0) return null;
            const isSearching = !!q;
            const metroEntries = entries.filter(e => e.metro === metro && e.category === selectedCategory);
            const metroPenetration = metroEntries.length
              ? penetration(metroEntries.reduce((s, e) => s + e.contacted, 0), metroEntries.reduce((s, e) => s + e.totalBusinesses, 0))
              : 0;
            const metroMRR = metroEntries.reduce((s, e) => s + e.mrr, 0);
            const expanded = isSearching || expandedMetros.has(metro);

            return (
              <div key={metro} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => toggleMetro(metro)}>
                  {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium flex-1">{metro}</span>
                  <span className="text-xs text-muted-foreground">{isSearching ? `${filteredCities.length}/` : ""}{cities.length} cities</span>
                  {metroMRR > 0 && <span className="text-xs font-medium text-green-500">{Math.round(metroMRR).toLocaleString("pl-PL")} PLN MRR</span>}
                  {metroPenetration > 0 && (
                    <span className={`text-xs font-medium ${metroPenetration >= 70 ? "text-red-500" : metroPenetration >= 30 ? "text-amber-500" : "text-green-500"}`}>
                      {metroPenetration}% penetrated
                    </span>
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-border divide-y divide-border">
                    {filteredCities.map(city => {
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

      {editing && <EntryModal entry={editing} allCategories={BUSINESS_CATEGORIES} onSave={saveEntry} onClose={() => setEditing(null)} />}
      {showSettings && <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
