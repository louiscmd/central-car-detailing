"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Check, Plus, Trash2, Edit2, X, ChevronDown, ChevronRight,
  ChevronLeft, Clock, CheckSquare, Calendar,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  groupId?: string | null;
  position: number;
}

interface TaskGroup {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HOUR_H = 64; // px per hour

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function fmtTime(dt: string) {
  const d = new Date(dt);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function toLocalDatetimeValue(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function minutesFromMidnight(isoString: string) {
  const d = new Date(isoString);
  return d.getHours() * 60 + d.getMinutes();
}

function toHHMM(isoString: string) {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const MONTH_NAMES = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ─── Mini month-picker ────────────────────────────────────────────────────────

function MonthPicker({ selected, onChange, onClose }: {
  selected: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const today = new Date();

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 bg-card border border-border rounded-xl shadow-xl p-3 w-56">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }}
          className="p-1 rounded hover:bg-accent text-muted-foreground"><ChevronLeft className="w-3.5 h-3.5" /></button>
        <div className="flex items-center gap-1.5">
          <select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))}
            className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer">
            {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))}
            className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer">
            {Array.from({ length: 10 }, (_, i) => today.getFullYear() - 2 + i).map(y =>
              <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }}
          className="p-1 rounded hover:bg-accent text-muted-foreground"><ChevronRight className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(viewYear, viewMonth, day);
          const isSel = isSameDay(date, selected);
          const isTdy = isSameDay(date, today);
          return (
            <button key={i} onClick={() => { onChange(date); onClose(); }}
              className={`h-6 w-full rounded text-[11px] flex items-center justify-center transition-colors font-medium
                ${isSel ? "bg-primary text-primary-foreground" :
                  isTdy ? "bg-accent text-foreground" :
                  "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule modal ───────────────────────────────────────────────────────────

function ScheduleModal({ task, calendarDate, onSave, onClear, onClose }: {
  task: Task;
  calendarDate: Date;
  onSave: (start: string, end: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const defaultDate = task.scheduledStart
    ? new Date(task.scheduledStart).toISOString().slice(0, 10)
    : calendarDate.toISOString().slice(0, 10);

  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(task.scheduledStart ? toHHMM(task.scheduledStart) : "09:00");
  const [endTime, setEndTime] = useState(task.scheduledEnd ? toHHMM(task.scheduledEnd) : "10:00");

  const handleSave = () => {
    const d = new Date(date);
    onSave(
      toLocalDatetimeValue(d, startTime),
      toLocalDatetimeValue(d, endTime),
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-5 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-sm">Schedule — {task.title}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Start</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">End</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={handleSave}
            className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Save
          </button>
          {task.scheduledStart && (
            <button onClick={onClear}
              className="px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-destructive hover:border-destructive transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day calendar ─────────────────────────────────────────────────────────────

function DayCalendar({ date, tasks, onNavigate }: {
  date: Date;
  tasks: Task[];
  onNavigate: (d: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Scroll to 7am on mount
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_H;
  }, []);

  // Close picker on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    }
    if (showPicker) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPicker]);

  const dayLabel = DAY_NAMES[date.getDay()];
  const dateLabel = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  const isToday = isSameDay(date, today);

  const dayTasks = tasks.filter(t => t.scheduledStart && isSameDay(new Date(t.scheduledStart), date));

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const nowTop = (nowMinutes / 60) * HOUR_H;

  const prev = () => { const d = new Date(date); d.setDate(d.getDate() - 1); onNavigate(d); };
  const next = () => { const d = new Date(date); d.setDate(d.getDate() + 1); onNavigate(d); };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Calendar className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Daily Schedule</h2>
      </div>

      <div className="flex items-center justify-between mb-3 shrink-0">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative text-center" ref={pickerRef}>
          <button onClick={() => setShowPicker(v => !v)}
            className="flex flex-col items-center hover:text-primary transition-colors">
            <span className="text-xs text-muted-foreground">{dayLabel}</span>
            <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>{dateLabel}</span>
          </button>
          {showPicker && (
            <MonthPicker selected={date} onChange={onNavigate} onClose={() => setShowPicker(false)} />
          )}
        </div>

        <button onClick={next} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Today button */}
      {!isToday && (
        <button onClick={() => onNavigate(new Date())}
          className="text-xs text-muted-foreground hover:text-primary transition-colors mb-2 text-center shrink-0">
          Back to today
        </button>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative min-h-0 bg-card border border-border rounded-xl">
        <div className="relative" style={{ height: 24 * HOUR_H }}>
          {/* Hour lines */}
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="absolute w-full flex items-start" style={{ top: h * HOUR_H }}>
              <span className="text-[10px] text-muted-foreground w-10 shrink-0 text-right pr-2 pt-0.5 select-none">
                {String(h).padStart(2, "0")}:00
              </span>
              <div className="flex-1 border-t border-border/50" />
            </div>
          ))}

          {/* Half-hour lines */}
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="absolute w-full flex items-start pointer-events-none"
              style={{ top: h * HOUR_H + HOUR_H / 2 }}>
              <span className="w-10 shrink-0" />
              <div className="flex-1 border-t border-border/20" />
            </div>
          ))}

          {/* Current time indicator */}
          {isToday && (
            <div className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
              style={{ top: nowTop }}>
              <span className="w-10 shrink-0" />
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
              <div className="flex-1 border-t-2 border-red-500" />
            </div>
          )}

          {/* Task blocks */}
          {dayTasks.map(task => {
            const startMin = minutesFromMidnight(task.scheduledStart!);
            const endMin = task.scheduledEnd
              ? minutesFromMidnight(task.scheduledEnd)
              : startMin + 60;
            const durationMin = Math.max(endMin - startMin, 30);
            const top = (startMin / 60) * HOUR_H;
            const height = Math.max((durationMin / 60) * HOUR_H, 24);

            return (
              <div key={task.id}
                className={`absolute left-11 right-2 rounded-lg px-2 py-1 text-xs overflow-hidden border-l-2 transition-opacity
                  ${task.completed
                    ? "bg-muted/40 border-muted-foreground text-muted-foreground line-through"
                    : "bg-primary/15 border-primary text-foreground"}`}
                style={{ top, height }}>
                <p className="font-medium leading-tight truncate">{task.title}</p>
                <p className="text-muted-foreground text-[10px]">
                  {fmtTime(task.scheduledStart!)}
                  {task.scheduledEnd && ` → ${fmtTime(task.scheduledEnd)}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Task item ────────────────────────────────────────────────────────────────

function TaskItem({ task, calendarDate, onToggle, onDelete, onRename, onSchedule }: {
  task: Task;
  calendarDate: Date;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (t: string) => void;
  onSchedule: (start: string | null, end: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== task.title) onRename(t); else setDraft(task.title);
    setEditing(false);
  };

  const isScheduled = !!task.scheduledStart;

  return (
    <>
      <div className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/40 transition-colors ${task.completed ? "opacity-55" : ""}`}>
        <button onClick={onToggle}
          className={`shrink-0 rounded border transition-colors flex items-center justify-center
            ${task.completed ? "bg-primary border-primary" : "border-border hover:border-primary"}`}
          style={{ width: 17, height: 17 }}>
          {task.completed && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
        </button>

        {editing ? (
          <input ref={inputRef} value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(task.title); setEditing(false); } }}
            className="flex-1 bg-transparent text-sm outline-none border-b border-primary" />
        ) : (
          <span onDoubleClick={() => setEditing(true)}
            className={`flex-1 text-sm select-none truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
        )}

        {isScheduled && (
          <span className="text-[10px] text-primary shrink-0 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {fmtTime(task.scheduledStart!)}
          </span>
        )}

        <div className="relative shrink-0" ref={menuRef}>
          <button onClick={() => setMenuOpen(o => !o)}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all text-base leading-none">
            ···
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 w-36 text-sm">
              <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-left">
                <Edit2 className="w-3.5 h-3.5" /> Rename
              </button>
              <button onClick={() => { setScheduling(true); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-left">
                <Clock className="w-3.5 h-3.5" /> {isScheduled ? "Edit time" : "Schedule"}
              </button>
              <div className="my-1 border-t border-border" />
              <button onClick={() => { onDelete(); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-left text-destructive">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {scheduling && (
        <ScheduleModal
          task={task}
          calendarDate={calendarDate}
          onSave={(start, end) => { onSchedule(start, end); setScheduling(false); }}
          onClear={() => { onSchedule(null, null); setScheduling(false); }}
          onClose={() => setScheduling(false)}
        />
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [ungrouped, setUngrouped] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [newTask, setNewTask] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [groupTaskInput, setGroupTaskInput] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  useEffect(() => {
    fetch("/api/tasks").then(r => r.json()).then(data => {
      setGroups(data.groups ?? []);
      setUngrouped(data.ungrouped ?? []);
      setLoading(false);
    });
  }, []);

  const allTasks = [...ungrouped, ...groups.flatMap(g => g.tasks)];

  const addTask = useCallback(async (title: string, groupId?: string) => {
    if (!title.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), groupId }),
    });
    const task: Task = await res.json();
    if (groupId) {
      setGroups(gs => gs.map(g => g.id === groupId ? { ...g, tasks: [...g.tasks, task] } : g));
    } else {
      setUngrouped(prev => [...prev, task]);
    }
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    const applyPatch = (t: Task) => t.id === id ? { ...t, ...patch } : t;
    setUngrouped(prev => prev.map(applyPatch));
    setGroups(gs => gs.map(g => ({ ...g, tasks: g.tasks.map(applyPatch) })));
  }, []);

  const toggleTask = useCallback(async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    updateTask(task.id, { completed: !task.completed });
  }, [updateTask]);

  const deleteTask = useCallback(async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setUngrouped(prev => prev.filter(t => t.id !== task.id));
    setGroups(gs => gs.map(g => ({ ...g, tasks: g.tasks.filter(t => t.id !== task.id) })));
  }, []);

  const renameTask = useCallback(async (task: Task, title: string) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    updateTask(task.id, { title });
  }, [updateTask]);

  const scheduleTask = useCallback(async (task: Task, start: string | null, end: string | null) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledStart: start, scheduledEnd: end }),
    });
    updateTask(task.id, { scheduledStart: start, scheduledEnd: end });
  }, [updateTask]);

  const addGroup = useCallback(async () => {
    if (!newGroup.trim()) return;
    const res = await fetch("/api/tasks/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroup.trim() }),
    });
    const group: TaskGroup = await res.json();
    setGroups(prev => [...prev, group]);
    setNewGroup("");
  }, [newGroup]);

  const renameGroup = useCallback(async (id: string, name: string) => {
    await fetch(`/api/tasks/groups/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setGroups(gs => gs.map(g => g.id === id ? { ...g, name } : g));
    setEditingGroupId(null);
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    await fetch(`/api/tasks/groups/${id}`, { method: "DELETE" });
    setGroups(gs => gs.filter(g => g.id !== id));
  }, []);

  const taskProps = (task: Task) => ({
    task, calendarDate,
    onToggle: () => toggleTask(task),
    onDelete: () => deleteTask(task),
    onRename: (t: string) => renameTask(task, t),
    onSchedule: (start: string | null, end: string | null) => scheduleTask(task, start, end),
  });

  return (
    <div className="flex gap-0 h-full -m-6 overflow-hidden">

      {/* ── LEFT: Daily Checklist ───────────────────────────── */}
      <div className="w-1/2 flex flex-col border-r border-border p-6 min-h-0">
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <CheckSquare className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Daily Checklist</h1>
        </div>

        {/* Quick add */}
        <form onSubmit={e => { e.preventDefault(); addTask(newTask); setNewTask(""); }}
          className="flex gap-2 mb-4 shrink-0">
          <input value={newTask} onChange={e => setNewTask(e.target.value)}
            placeholder="Add a task…"
            className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <button type="submit"
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* Ungrouped */}
            {ungrouped.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1">General</span>
                  <span className="text-xs text-muted-foreground">{ungrouped.filter(t => t.completed).length}/{ungrouped.length}</span>
                </div>
                <div className="py-1">
                  {ungrouped.map(task => <TaskItem key={task.id} {...taskProps(task)} />)}
                </div>
              </div>
            )}

            {/* Groups */}
            {groups.map(group => {
              const done = group.tasks.filter(t => t.completed).length;
              const isCollapsed = collapsed.has(group.id);
              return (
                <div key={group.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 group/header">
                    <button onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(group.id) ? n.delete(group.id) : n.add(group.id); return n; })}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {editingGroupId === group.id ? (
                      <input autoFocus value={editingGroupName}
                        onChange={e => setEditingGroupName(e.target.value)}
                        onBlur={() => renameGroup(group.id, editingGroupName || group.name)}
                        onKeyDown={e => { if (e.key === "Enter") renameGroup(group.id, editingGroupName || group.name); if (e.key === "Escape") setEditingGroupId(null); }}
                        className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-primary" />
                    ) : (
                      <span onDoubleClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
                        className="flex-1 text-sm font-medium cursor-default select-none">
                        {group.name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{done}/{group.tasks.length}</span>
                    <button onClick={() => deleteGroup(group.id)}
                      className="opacity-0 group-hover/header:opacity-100 p-1 hover:text-destructive text-muted-foreground transition-all rounded shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {!isCollapsed && (
                    <div className="py-1">
                      {group.tasks.map(task => <TaskItem key={task.id} {...taskProps(task)} />)}
                      {addingToGroup === group.id ? (
                        <form onSubmit={e => { e.preventDefault(); addTask(groupTaskInput, group.id); setGroupTaskInput(""); setAddingToGroup(null); }}
                          className="flex items-center gap-2 px-3 py-2">
                          <input autoFocus value={groupTaskInput}
                            onChange={e => setGroupTaskInput(e.target.value)}
                            onBlur={() => { if (!groupTaskInput.trim()) setAddingToGroup(null); }}
                            onKeyDown={e => e.key === "Escape" && setAddingToGroup(null)}
                            placeholder="Task name…"
                            className="flex-1 bg-transparent text-sm outline-none border-b border-border focus:border-primary" />
                          <button type="submit" className="text-xs text-primary">Add</button>
                        </form>
                      ) : (
                        <button onClick={() => { setAddingToGroup(group.id); setGroupTaskInput(""); }}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                          <Plus className="w-3 h-3" /> Add task
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add group */}
            <form onSubmit={e => { e.preventDefault(); addGroup(); }} className="flex gap-2 pt-1">
              <input value={newGroup} onChange={e => setNewGroup(e.target.value)}
                placeholder="New group name…"
                className="flex-1 bg-card border border-dashed border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-muted-foreground" />
              {newGroup.trim() && (
                <button type="submit"
                  className="px-3 py-2 bg-card border border-border rounded-lg text-sm hover:bg-accent transition-colors text-muted-foreground">
                  Add
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      {/* ── RIGHT: Daily Schedule ───────────────────────────── */}
      <div className="w-1/2 flex flex-col p-6 min-h-0">
        <DayCalendar
          date={calendarDate}
          tasks={allTasks}
          onNavigate={setCalendarDate}
        />
      </div>
    </div>
  );
}
