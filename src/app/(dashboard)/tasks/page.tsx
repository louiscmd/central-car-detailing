"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Plus, Trash2, Edit2, X, ChevronDown, ChevronRight, Calendar, CheckSquare } from "lucide-react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
  groupId?: string | null;
  position: number;
}

interface TaskGroup {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function MiniCalendar({
  selectedDate,
  onSelect,
  taskDates,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  taskDates: Date[];
}) {
  const [viewing, setViewing] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const today = new Date();

  const year = viewing.getFullYear();
  const month = viewing.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Monday-first

  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthName = viewing.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{monthName}</span>
        <div className="flex gap-1">
          <button onClick={() => setViewing(new Date(year, month - 1, 1))}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
          <button onClick={() => setViewing(new Date(year, month + 1, 1))}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(year, month, day);
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const hasTasks = taskDates.some(td => isSameDay(td, date));
          return (
            <button key={i} onClick={() => onSelect(date)}
              className={`relative h-7 w-full rounded text-xs flex items-center justify-center transition-colors font-medium
                ${isSelected ? "bg-primary text-primary-foreground" :
                  isToday ? "bg-accent text-foreground" :
                  "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
              {day}
              {hasTasks && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary opacity-70" />
              )}
            </button>
          );
        })}
      </div>
      <button onClick={() => { onSelect(today); setViewing(new Date(today.getFullYear(), today.getMonth(), 1)); }}
        className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground text-center transition-colors">
        Today
      </button>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  onRename,
  onSetDate,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (t: string) => void;
  onSetDate: (d: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [datePicking, setDatePicking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const commitRename = () => {
    const t = draft.trim();
    if (t && t !== task.title) onRename(t);
    else setDraft(task.title);
    setEditing(false);
  };

  return (
    <div className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors ${task.completed ? "opacity-60" : ""}`}>
      <button onClick={onToggle}
        className={`shrink-0 w-4.5 h-4.5 rounded border transition-colors flex items-center justify-center
          ${task.completed ? "bg-primary border-primary" : "border-border hover:border-primary"}`}
        style={{ width: 18, height: 18 }}>
        {task.completed && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>

      {editing ? (
        <input ref={inputRef} value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setDraft(task.title); setEditing(false); } }}
          className="flex-1 bg-transparent text-sm outline-none border-b border-primary"
        />
      ) : (
        <span onDoubleClick={() => setEditing(true)}
          className={`flex-1 text-sm select-none ${task.completed ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </span>
      )}

      {task.dueDate && !editing && (
        <span className="text-[10px] text-muted-foreground shrink-0">
          {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      )}

      <div className="relative shrink-0" ref={menuRef}>
        <button onClick={() => setMenuOpen(o => !o)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-all text-muted-foreground hover:text-foreground">
          <span className="text-base leading-none">···</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 w-36 text-sm">
            <button onClick={() => { setEditing(true); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-left">
              <Edit2 className="w-3.5 h-3.5" /> Rename
            </button>
            <button onClick={() => { setDatePicking(true); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-left">
              <Calendar className="w-3.5 h-3.5" /> Set date
            </button>
            {task.dueDate && (
              <button onClick={() => { onSetDate(null); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-left text-muted-foreground">
                <X className="w-3.5 h-3.5" /> Clear date
              </button>
            )}
            <div className="my-1 border-t border-border" />
            <button onClick={() => { onDelete(); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-left text-destructive">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {datePicking && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40" onClick={() => setDatePicking(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-xl p-4 shadow-xl">
            <p className="text-sm font-medium mb-3">Set due date</p>
            <input type="date" defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={e => { onSetDate(e.target.value || null); setDatePicking(false); }}
            />
            <button onClick={() => setDatePicking(false)} className="mt-2 text-xs text-muted-foreground hover:text-foreground w-full text-center">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [ungrouped, setUngrouped] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date());
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
  const taskDates = allTasks.filter(t => t.dueDate).map(t => new Date(t.dueDate!));
  const tasksForDay = allTasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate));

  async function addTask(title: string, groupId?: string) {
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
  }

  async function toggleTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    const update = (t: Task) => t.id === task.id ? { ...t, completed: !t.completed } : t;
    setUngrouped(prev => prev.map(update));
    setGroups(gs => gs.map(g => ({ ...g, tasks: g.tasks.map(update) })));
  }

  async function deleteTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setUngrouped(prev => prev.filter(t => t.id !== task.id));
    setGroups(gs => gs.map(g => ({ ...g, tasks: g.tasks.filter(t => t.id !== task.id) })));
  }

  async function renameTask(task: Task, title: string) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const update = (t: Task) => t.id === task.id ? { ...t, title } : t;
    setUngrouped(prev => prev.map(update));
    setGroups(gs => gs.map(g => ({ ...g, tasks: g.tasks.map(update) })));
  }

  async function setTaskDate(task: Task, dueDate: string | null) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate }),
    });
    const update = (t: Task) => t.id === task.id ? { ...t, dueDate } : t;
    setUngrouped(prev => prev.map(update));
    setGroups(gs => gs.map(g => ({ ...g, tasks: g.tasks.map(update) })));
  }

  async function addGroup() {
    if (!newGroup.trim()) return;
    const res = await fetch("/api/tasks/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroup.trim() }),
    });
    const group: TaskGroup = await res.json();
    setGroups(prev => [...prev, group]);
    setNewGroup("");
  }

  async function renameGroup(id: string, name: string) {
    await fetch(`/api/tasks/groups/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setGroups(gs => gs.map(g => g.id === id ? { ...g, name } : g));
    setEditingGroupId(null);
  }

  async function deleteGroup(id: string) {
    await fetch(`/api/tasks/groups/${id}`, { method: "DELETE" });
    setGroups(gs => gs.filter(g => g.id !== id));
  }

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const taskProps = (task: Task) => ({
    task,
    onToggle: () => toggleTask(task),
    onDelete: () => deleteTask(task),
    onRename: (t: string) => renameTask(task, t),
    onSetDate: (d: string | null) => setTaskDate(task, d),
  });

  return (
    <div className="flex gap-6 h-full max-w-6xl mx-auto">
      {/* ── Left: Checklist ─────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-semibold">Daily Checklist</h1>
          </div>
        </div>

        {/* Quick add */}
        <form onSubmit={e => { e.preventDefault(); addTask(newTask); setNewTask(""); }}
          className="flex gap-2">
          <input value={newTask} onChange={e => setNewTask(e.target.value)}
            placeholder="Add a task…"
            className="flex-1 bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <button type="submit" className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {loading ? (
          <div className="text-center text-muted-foreground py-12 text-sm">Loading…</div>
        ) : (
          <div className="space-y-3 overflow-y-auto flex-1 pb-4">
            {/* Ungrouped tasks */}
            {ungrouped.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">General</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {ungrouped.filter(t => t.completed).length}/{ungrouped.length}
                  </span>
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
                  <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                    <button onClick={() => toggleCollapse(group.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {editingGroupId === group.id ? (
                      <input autoFocus value={editingGroupName}
                        onChange={e => setEditingGroupName(e.target.value)}
                        onBlur={() => renameGroup(group.id, editingGroupName || group.name)}
                        onKeyDown={e => {
                          if (e.key === "Enter") renameGroup(group.id, editingGroupName || group.name);
                          if (e.key === "Escape") setEditingGroupId(null);
                        }}
                        className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-primary"
                      />
                    ) : (
                      <span onDoubleClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}
                        className="flex-1 text-sm font-medium cursor-default select-none">
                        {group.name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{done}/{group.tasks.length}</span>
                    <button onClick={() => deleteGroup(group.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive text-muted-foreground transition-colors rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="py-1">
                      {group.tasks.map(task => <TaskItem key={task.id} {...taskProps(task)} />)}
                      {addingToGroup === group.id ? (
                        <form onSubmit={e => { e.preventDefault(); addTask(groupTaskInput, group.id); setGroupTaskInput(""); setAddingToGroup(null); }}
                          className="flex items-center gap-2 px-3 py-2">
                          <input autoFocus value={groupTaskInput} onChange={e => setGroupTaskInput(e.target.value)}
                            onBlur={() => { if (!groupTaskInput.trim()) setAddingToGroup(null); }}
                            onKeyDown={e => e.key === "Escape" && setAddingToGroup(null)}
                            placeholder="Task name…"
                            className="flex-1 bg-transparent text-sm outline-none border-b border-border focus:border-primary" />
                          <button type="submit" className="text-xs text-primary hover:text-primary/80">Add</button>
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
            <form onSubmit={e => { e.preventDefault(); addGroup(); }}
              className="flex gap-2 pt-1">
              <input value={newGroup} onChange={e => setNewGroup(e.target.value)}
                placeholder="New group name…"
                className="flex-1 bg-card border border-dashed border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-muted-foreground placeholder:text-muted-foreground/60" />
              {newGroup.trim() && (
                <button type="submit" className="px-3 py-2 bg-card border border-border rounded-lg text-sm hover:bg-accent transition-colors text-muted-foreground">
                  Add group
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      {/* ── Right: Calendar ─────────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Calendar</h2>
        </div>

        <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} taskDates={taskDates} />

        {/* Tasks for selected day */}
        <div className="bg-card border border-border rounded-xl p-3 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {selectedDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </p>
          {tasksForDay.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tasks scheduled</p>
          ) : (
            <div className="space-y-1">
              {tasksForDay.map(task => (
                <div key={task.id} className={`flex items-center gap-2 text-xs ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.completed ? "bg-muted-foreground" : "bg-primary"}`} />
                  {task.title}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
