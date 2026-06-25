"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay, closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, X, ChevronRight, Bell, AlertTriangle, CheckCircle2,
  Phone, Mail, Instagram, Globe, MapPin, Building2, Calendar,
  TrendingUp, Users, Target, Award, Clock, Edit2, Trash2, Check,
  ChevronDown, Filter, Search,
} from "lucide-react";
import {
  LEAD_SOURCES, ACTIVITY_LABELS, ACTIVITY_ICONS, PRIORITY_LABELS, PRIORITY_COLORS,
  calcExpectedValue, scoreLabel, scoreBadgeClass, formatRelative, formatDueDate, daysBetween, STAGE_WARNINGS,
} from "@/lib/deal-utils";
import { BUSINESS_CATEGORIES } from "@/lib/territory-data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stage { id: string; name: string; position: number; color: string; _count: { leads: number } }
interface FollowUp { id: string; dueDate: string; priority: string; note?: string; completed: boolean }
interface Activity { id: string; type: string; note?: string; createdAt: string; metadata?: Record<string, string> }
interface Lead {
  id: string; stageId: string; stage: Stage;
  businessName: string; category?: string; city?: string; contactName?: string;
  instagram?: string; phone?: string; email?: string; website?: string; notes?: string;
  source: string; score: number;
  expectedRetainer: number; setupFee: number; closeProbability: number;
  activities: Activity[]; followUps: FollowUp[];
  _count: { activities: number; followUps: number };
  createdAt: string; updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => n > 0 ? `${Math.round(n).toLocaleString("pl-PL")} PLN` : "—";
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const nextNDays = (n: number) => { const d = today(); d.setDate(d.getDate() + n); return d; };

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${scoreBadgeClass(score)}`}>
      {scoreLabel(score)} {score}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  return <span className={`text-xs font-medium ${PRIORITY_COLORS[priority] ?? "text-slate-400"}`}>{PRIORITY_LABELS[priority] ?? priority}</span>;
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const nextFollowUp = lead.followUps.find(f => !f.completed);
  const due = nextFollowUp ? formatDueDate(nextFollowUp.dueDate) : null;
  const ev = calcExpectedValue(lead.expectedRetainer, lead.setupFee, lead.closeProbability);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all select-none space-y-2">
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-semibold leading-tight line-clamp-1">{lead.businessName}</p>
        <ScoreBadge score={lead.score} />
      </div>
      {(lead.category || lead.city) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {lead.category && <span>{BUSINESS_CATEGORIES.find(c => c.value === lead.category)?.label ?? lead.category}</span>}
          {lead.category && lead.city && <span>·</span>}
          {lead.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{lead.city}</span>}
        </div>
      )}
      {lead.contactName && <p className="text-xs text-muted-foreground">{lead.contactName}</p>}
      <div className="flex items-center justify-between">
        {ev > 0 ? <span className="text-xs font-medium text-green-400">{fmt(ev)}</span> : <span />}
        {due && (
          <span className={`text-[10px] font-medium ${due.overdue ? "text-red-400" : due.urgent ? "text-amber-400" : "text-muted-foreground"}`}>
            {due.overdue ? "⚠ " : "🔔 "}{due.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Add / Edit Lead Modal ────────────────────────────────────────────────────

const EMPTY_LEAD = {
  businessName: "", category: "", city: "", contactName: "", instagram: "",
  phone: "", email: "", website: "", notes: "", source: "INSTAGRAM_DM",
  expectedRetainer: 0, setupFee: 0, closeProbability: 0.5, stageId: "",
};

function LeadFormModal({ stages, initial, onSave, onClose }: {
  stages: Stage[];
  initial?: Partial<typeof EMPTY_LEAD & { id: string }>;
  onSave: (data: typeof EMPTY_LEAD & { id?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_LEAD, stageId: stages[0]?.id ?? "", ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.businessName.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const field = (label: string, key: string, type: "text" | "number" | "textarea" = "text", placeholder = "") => (
    <div key={key}>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea rows={3} value={form[key as keyof typeof form] as string} onChange={e => set(key, e.target.value)} placeholder={placeholder}
          className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
      ) : (
        <input type={type} value={form[key as keyof typeof form] as string | number} onChange={e => set(key, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)} placeholder={placeholder}
          className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">{initial?.id ? "Edit Lead" : "New Lead"}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-4">
            {field("Business Name *", "businessName", "text", "e.g. Pizza Roma")}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Stage</label>
              <select value={form.stageId} onChange={e => set("stageId", e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">— select —</option>
                {BUSINESS_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {field("City", "city", "text", "e.g. Warsaw")}
            {field("Contact Name", "contactName", "text", "First Last")}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Lead Source</label>
              <select value={form.source} onChange={e => set("source", e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {field("Instagram", "instagram", "text", "@handle")}
            {field("Phone", "phone", "text", "+48...")}
            {field("Email", "email", "text", "email@example.com")}
            {field("Website", "website", "text", "https://")}
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Revenue Potential</p>
            <div className="grid grid-cols-3 gap-4">
              {field("Monthly Retainer (PLN)", "expectedRetainer", "number")}
              {field("Setup Fee (PLN)", "setupFee", "number")}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Close Probability</label>
                <select value={form.closeProbability} onChange={e => set("closeProbability", parseFloat(e.target.value))}
                  className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(v => (
                    <option key={v} value={v}>{Math.round(v * 100)}%</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {field("Notes", "notes", "textarea")}
        </div>
        <div className="flex gap-2 justify-end p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.businessName.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Saving…" : initial?.id ? "Save Changes" : "Add Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Follow-up Modal ──────────────────────────────────────────────────────────

function FollowUpModal({ leadId, onSave, onClose }: { leadId: string; onSave: () => void; onClose: () => void }) {
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); });
  const [priority, setPriority] = useState("MEDIUM");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/deals/${leadId}/followups`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate, priority, note }),
    });
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Schedule Follow-up</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Due Date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Note</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Send proposal draft"
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Saving…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lead Drawer ──────────────────────────────────────────────────────────────

function LeadDrawer({ lead: initial, stages, onUpdate, onClose }: {
  lead: Lead; stages: Stage[]; onUpdate: (lead: Lead) => void; onClose: () => void;
}) {
  const [lead, setLead] = useState(initial);
  const [tab, setTab] = useState<"info" | "timeline" | "followups" | "revenue">("info");
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activityType, setActivityType] = useState("DM_SENT");
  const [activityNote, setActivityNote] = useState("");
  const [logSaving, setLogSaving] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/deals/${lead.id}`);
    if (res.ok) { const d = await res.json(); setLead(d); onUpdate(d); }
  }, [lead.id, onUpdate]);

  const logActivity = async () => {
    if (!activityNote.trim()) return;
    setLogSaving(true);
    await fetch(`/api/deals/${lead.id}/activities`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activityType, note: activityNote }),
    });
    setActivityNote("");
    setLogSaving(false);
    refresh();
  };

  const completeFollowUp = async (followUpId: string) => {
    await fetch(`/api/deals/${lead.id}/followups`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followUpId, note: "Completed" }),
    });
    refresh();
  };

  const moveStage = async (stageId: string) => {
    await fetch(`/api/deals/${lead.id}/stage`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    refresh();
  };

  const ev = calcExpectedValue(lead.expectedRetainer, lead.setupFee, lead.closeProbability);
  const openFollowUps = lead.followUps.filter(f => !f.completed);
  const doneFollowUps = lead.followUps.filter(f => f.completed);

  const ACTIVITY_ACTIONS = ["DM_SENT", "CALLED", "EMAILED", "MEETING_HELD", "PROPOSAL_SENT", "CONTRACT_SENT", "NOTE_ADDED"];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-card border-l border-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg truncate">{lead.businessName}</h2>
              <ScoreBadge score={lead.score} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {lead.category && <span>{BUSINESS_CATEGORIES.find(c => c.value === lead.category)?.label ?? lead.category}</span>}
              {lead.city && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{lead.city}</span>}
              <span>Added {formatRelative(lead.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button onClick={() => setShowEdit(true)} className="p-1.5 rounded-md hover:bg-accent"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
            <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        {/* Stage selector */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-2 overflow-x-auto scrollbar-none">
          {stages.map(s => (
            <button key={s.id} onClick={() => moveStage(s.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${s.id === lead.stageId ? "text-white" : "bg-muted text-muted-foreground hover:bg-accent"}`}
              style={s.id === lead.stageId ? { backgroundColor: s.color } : {}}>
              {s.name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {(["info", "timeline", "followups", "revenue"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-2.5 px-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "followups" ? `Follow-ups (${openFollowUps.length})` : t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm hover:bg-muted/50">
                    <Phone className="w-4 h-4 text-muted-foreground" />{lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm hover:bg-muted/50">
                    <Mail className="w-4 h-4 text-muted-foreground" />{lead.email}
                  </a>
                )}
                {lead.instagram && (
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm">
                    <Instagram className="w-4 h-4 text-muted-foreground" />{lead.instagram}
                  </div>
                )}
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-sm hover:bg-muted/50">
                    <Globe className="w-4 h-4 text-muted-foreground" />Website
                  </a>
                )}
              </div>
              {lead.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Lead Source</p>
                <p className="text-sm">{LEAD_SOURCES.find(s => s.value === lead.source)?.label ?? lead.source}</p>
              </div>
              {/* Log activity */}
              <div className="border border-border rounded-lg p-3 space-y-3">
                <p className="text-xs font-medium">Log Activity</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={activityType} onChange={e => setActivityType(e.target.value)}
                    className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    {ACTIVITY_ACTIONS.map(a => <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>)}
                  </select>
                  <input type="text" value={activityNote} onChange={e => setActivityNote(e.target.value)}
                    placeholder="Add a note…" onKeyDown={e => e.key === "Enter" && logActivity()}
                    className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <button onClick={logActivity} disabled={logSaving || !activityNote.trim()}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                  {logSaving ? "Logging…" : "Log"}
                </button>
              </div>
            </div>
          )}

          {tab === "timeline" && (
            <div className="relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3">
                {lead.activities.map(a => (
                  <div key={a.id} className="relative pl-8">
                    <span className="absolute left-0 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[10px]">
                      {ACTIVITY_ICONS[a.type] ?? "·"}
                    </span>
                    <div className="bg-muted/30 rounded-lg p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{ACTIVITY_LABELS[a.type] ?? a.type}</span>
                        <span className="text-[10px] text-muted-foreground">{formatRelative(a.createdAt)}</span>
                      </div>
                      {a.note && <p className="text-xs text-muted-foreground mt-1">{a.note}</p>}
                    </div>
                  </div>
                ))}
                {lead.activities.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>}
              </div>
            </div>
          )}

          {tab === "followups" && (
            <div className="space-y-3">
              <button onClick={() => setShowFollowUpModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
                <Plus className="w-4 h-4" /> Schedule Follow-up
              </button>
              {openFollowUps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Pending</p>
                  {openFollowUps.map(f => {
                    const due = formatDueDate(f.dueDate);
                    return (
                      <div key={f.id} className={`flex items-start gap-3 p-3 rounded-lg border ${due.overdue ? "border-red-500/30 bg-red-500/5" : due.urgent ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/20"}`}>
                        <button onClick={() => completeFollowUp(f.id)}
                          className="mt-0.5 w-5 h-5 rounded-full border-2 border-muted-foreground hover:border-green-500 hover:bg-green-500/10 flex items-center justify-center shrink-0 transition-colors">
                          <Check className="w-2.5 h-2.5 text-transparent hover:text-green-500" />
                        </button>
                        <div className="flex-1 min-w-0">
                          {f.note && <p className="text-sm">{f.note}</p>}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-medium ${due.overdue ? "text-red-400" : due.urgent ? "text-amber-400" : "text-muted-foreground"}`}>{due.label}</span>
                            <PriorityDot priority={f.priority} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {doneFollowUps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Completed</p>
                  {doneFollowUps.map(f => (
                    <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/10 opacity-60">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        {f.note && <p className="text-sm line-through">{f.note}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(f.dueDate).toLocaleDateString("en-GB")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {openFollowUps.length === 0 && doneFollowUps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No follow-ups scheduled.</p>
              )}
            </div>
          )}

          {tab === "revenue" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Monthly Retainer</p>
                  <p className="text-lg font-bold">{fmt(lead.expectedRetainer)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Setup Fee</p>
                  <p className="text-lg font-bold">{fmt(lead.setupFee)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Close Prob.</p>
                  <p className="text-lg font-bold">{Math.round(lead.closeProbability * 100)}%</p>
                </div>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Expected Value</p>
                <p className="text-2xl font-bold text-primary">{fmt(ev)}</p>
                <p className="text-xs text-muted-foreground mt-1">(retainer + 50% setup fee) × probability</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showFollowUpModal && (
        <FollowUpModal leadId={lead.id} onClose={() => setShowFollowUpModal(false)} onSave={() => { setShowFollowUpModal(false); refresh(); }} />
      )}

      {showEdit && (
        <LeadFormModal
          stages={stages}
          initial={{ ...lead }}
          onSave={async (data) => {
            await fetch(`/api/deals/${lead.id}`, {
              method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
            });
            setShowEdit(false);
            refresh();
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

function computeStats(leads: Lead[]) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const active = leads.filter(l => l.stage.name !== "Client Lost");
  const wonThisMonth = leads.filter(l => l.stage.name === "Client Won" && new Date(l.updatedAt) >= startOfMonth);
  const lostThisMonth = leads.filter(l => l.stage.name === "Client Lost" && new Date(l.updatedAt) >= startOfMonth);
  const addedThisMonth = leads.filter(l => new Date(l.createdAt) >= startOfMonth);
  const pipelineValue = active.reduce((s, l) => s + calcExpectedValue(l.expectedRetainer, l.setupFee, l.closeProbability), 0);
  const wonMRR = wonThisMonth.reduce((s, l) => s + l.expectedRetainer, 0);
  const hotLeads = active.filter(l => l.score >= 75).length;
  const closeRate = addedThisMonth.length > 0 ? Math.round((wonThisMonth.length / addedThisMonth.length) * 100) : 0;

  return { addedThisMonth: addedThisMonth.length, wonThisMonth: wonThisMonth.length, lostThisMonth: lostThisMonth.length, pipelineValue, wonMRR, hotLeads, closeRate };
}

function computeWarnings(leads: Lead[]): string[] {
  const warnings: string[] = [];
  for (const lead of leads) {
    const stageName = lead.stage.name;
    const warning = STAGE_WARNINGS[stageName];
    if (!warning) continue;
    const lastActivity = lead.activities[0];
    if (!lastActivity) continue;
    const days = daysBetween(lastActivity.createdAt);
    if (days >= warning.days) {
      warnings.push(`${lead.businessName}: ${warning.message.replace("{{days}}", String(days))}`);
    }
  }
  return warnings;
}

function computeAttention(leads: Lead[], stages: Stage[]) {
  const now = new Date();
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59);
  const weekEnd = nextNDays(7);

  const overdue: { lead: Lead; followUp: FollowUp }[] = [];
  const dueToday: { lead: Lead; followUp: FollowUp }[] = [];
  const dueWeek: { lead: Lead; followUp: FollowUp }[] = [];

  for (const lead of leads) {
    if (lead.stage.name === "Client Won" || lead.stage.name === "Client Lost") continue;
    for (const fu of lead.followUps) {
      if (fu.completed) continue;
      const d = new Date(fu.dueDate);
      if (d < today()) overdue.push({ lead, followUp: fu });
      else if (d <= todayEnd) dueToday.push({ lead, followUp: fu });
      else if (d <= weekEnd) dueWeek.push({ lead, followUp: fu });
    }
  }

  return { overdue, dueToday, dueWeek };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAttention, setShowAttention] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadAll = useCallback(async () => {
    try {
      const [sRes, lRes] = await Promise.all([fetch("/api/deals/stages"), fetch("/api/deals")]);
      const [s, l] = await Promise.all([sRes.json(), lRes.json()]);
      setStages(Array.isArray(s) ? s : []);
      setLeads(Array.isArray(l) ? l : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Filtered leads for display
  const filteredLeads = leads.filter(l => {
    if (search && !l.businessName.toLowerCase().includes(search.toLowerCase()) && !(l.contactName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory && l.category !== filterCategory) return false;
    if (filterCity && !(l.city ?? "").toLowerCase().includes(filterCity.toLowerCase())) return false;
    return true;
  });

  const leadsByStage = (stageId: string) => filteredLeads.filter(l => l.stageId === stageId);

  const stats = computeStats(leads);
  const warnings = computeWarnings(leads);
  const attention = computeAttention(leads, stages);
  const totalAttention = attention.overdue.length + attention.dueToday.length + attention.dueWeek.length;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragOver = async (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    // over.id is either a leadId or stageId
    const targetStageId = stages.find(s => s.id === over.id)?.id
      ?? leads.find(l => l.id === over.id)?.stageId;
    if (!targetStageId) return;
    const lead = leads.find(l => l.id === active.id);
    if (!lead || lead.stageId === targetStageId) return;
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === active.id ? { ...l, stageId: targetStageId, stage: stages.find(s => s.id === targetStageId) ?? l.stage } : l));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const targetStageId = stages.find(s => s.id === over.id)?.id
      ?? leads.find(l => l.id === over.id)?.stageId;
    if (!targetStageId) return;
    const lead = leads.find(l => l.id === active.id);
    if (!lead) return;
    await fetch(`/api/deals/${active.id}/stage`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: targetStageId }),
    });
    // Refresh to get updated score/activities
    const res = await fetch(`/api/deals/${active.id}`);
    if (res.ok) {
      const updated = await res.json();
      setLeads(prev => prev.map(l => l.id === active.id ? updated : l));
    }
  };

  const addLead = async (data: typeof EMPTY_LEAD) => {
    const res = await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { const lead = await res.json(); setLeads(prev => [lead, ...prev]); }
    setShowAdd(false);
  };

  const activeDragLead = activeId ? leads.find(l => l.id === activeId) : null;

  if (loading) return (
    <div className="flex flex-col h-full -m-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-3 w-48 bg-muted animate-pulse rounded mt-2" />
      </div>
      <div className="flex gap-4 p-6 overflow-x-auto flex-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-64 shrink-0 bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            {Array.from({ length: i % 2 === 0 ? 2 : 1 }).map((_, j) => (
              <div key={j} className="h-20 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full -m-6 overflow-hidden">
      {/* Top bar */}
      <div className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Deal Tracker</h1>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{leads.length} leads · {fmt(stats.pipelineValue)} pipeline</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads…"
              className="pl-8 pr-3 py-1.5 bg-muted/30 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary w-52" />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`p-1.5 rounded-md border transition-colors ${showFilters ? "border-primary text-primary bg-primary/10" : "border-border hover:bg-accent"}`}>
            <Filter className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Lead</span>
          </button>
        </div>
      </div>

      {/* Mobile search row — shown when filters open */}
      {showFilters && (
        <div className="px-4 pt-3 sm:hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads…"
              className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="px-4 sm:px-6 py-3 border-b border-border flex flex-wrap items-center gap-2 bg-muted/20 shrink-0">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="flex-1 sm:flex-none bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">All categories</option>
            {BUSINESS_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input value={filterCity} onChange={e => setFilterCity(e.target.value)} placeholder="Filter by city…"
            className="flex-1 sm:w-40 bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          {(filterCategory || filterCity) && (
            <button onClick={() => { setFilterCategory(""); setFilterCity(""); }} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="px-6 py-3 border-b border-border flex items-center gap-6 overflow-x-auto scrollbar-none shrink-0">
        {[
          { label: "Pipeline", value: fmt(stats.pipelineValue), icon: TrendingUp, color: "text-primary" },
          { label: "Won MRR", value: fmt(stats.wonMRR), icon: Award, color: "text-green-400" },
          { label: "Hot Leads", value: stats.hotLeads, icon: Target, color: "text-red-400" },
          { label: "Won / Lost", value: `${stats.wonThisMonth} / ${stats.lostThisMonth}`, icon: Users, color: "text-blue-400" },
          { label: "Close Rate", value: `${stats.closeRate}%`, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Added This Month", value: stats.addedThisMonth, icon: Building2, color: "text-purple-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-2 shrink-0">
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            <div>
              <p className="text-xs text-muted-foreground leading-none">{label}</p>
              <p className="text-sm font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Requires Attention */}
      {totalAttention > 0 && (
        <div className="px-6 py-2 border-b border-border bg-amber-500/5 shrink-0">
          <button onClick={() => setShowAttention(v => !v)}
            className="flex items-center gap-2 text-amber-400 text-sm font-medium w-full">
            <Bell className="w-4 h-4" />
            {attention.overdue.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{attention.overdue.length} overdue</span>}
            {attention.dueToday.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{attention.dueToday.length} today</span>}
            {attention.dueWeek.length > 0 && <span className="text-muted-foreground text-[10px]">{attention.dueWeek.length} this week</span>}
            <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${showAttention ? "rotate-180" : ""}`} />
          </button>
          {showAttention && (
            <div className="mt-2 space-y-1 pb-1">
              {[...attention.overdue, ...attention.dueToday].slice(0, 5).map(({ lead, followUp }) => {
                const due = formatDueDate(followUp.dueDate);
                return (
                  <div key={followUp.id} className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground text-muted-foreground"
                    onClick={() => setSelectedLead(lead)}>
                    <span className={due.overdue ? "text-red-400" : "text-amber-400"}>●</span>
                    <span className="font-medium text-foreground">{lead.businessName}</span>
                    <span>·</span>
                    <span>{followUp.note ?? "Follow-up"}</span>
                    <span className={`ml-auto font-medium ${due.overdue ? "text-red-400" : "text-amber-400"}`}>{due.label}</span>
                  </div>
                );
              })}
              {warnings.slice(0, 3).map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 p-4 h-full" style={{ minWidth: `${stages.length * 280 + (stages.length - 1) * 12 + 32}px` }}>
            {stages.map(stage => {
              const stageLeads = leadsByStage(stage.id);
              const stageValue = stageLeads.reduce((s, l) => s + calcExpectedValue(l.expectedRetainer, l.setupFee, l.closeProbability), 0);
              return (
                <div key={stage.id} id={stage.id}
                  className="flex flex-col w-[268px] shrink-0 bg-muted/20 rounded-xl border border-border">
                  <div className="px-3 pt-3 pb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold flex-1 truncate">{stage.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
                  </div>
                  {stageValue > 0 && <p className="px-3 pb-2 text-[10px] text-muted-foreground">{fmt(stageValue)}</p>}
                  <SortableContext items={stageLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[120px]"
                      onDragOver={e => e.preventDefault()}>
                      {stageLeads.map(lead => (
                        <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">Drop here</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                  <button onClick={() => { setShowAdd(true); }}
                    className="mx-2 mb-2 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add lead
                  </button>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {activeDragLead && <LeadCard lead={activeDragLead} onClick={() => {}} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      {showAdd && (
        <LeadFormModal stages={stages} onSave={addLead} onClose={() => setShowAdd(false)} />
      )}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          stages={stages}
          onClose={() => setSelectedLead(null)}
          onUpdate={updated => {
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            setSelectedLead(updated);
          }}
        />
      )}
    </div>
  );
}
