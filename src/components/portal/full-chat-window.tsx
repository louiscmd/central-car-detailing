"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Send, Plus, Hash, Mic, MicOff, X, Image as ImageIcon, FileVideo, Music, File,
  Reply, Trash2, CornerUpLeft, Paperclip, BarChart3, FileText, Pencil, Check, ChevronLeft, Menu as MenuIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { uploadFiles } from "@/lib/uploadthing";

interface Attachment {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
  filename: string;
  size: number;
}

interface ReplyPreview {
  id: string;
  content: string | null;
  sender: { name: string | null };
}

interface Message {
  id: string;
  content: string | null;
  createdAt: string;
  editedAt?: string | null;
  senderId: string;
  channelId: string | null;
  attachments: Attachment[];
  sender: { id: string; name: string; role: string };
  replyTo?: ReplyPreview | null;
}

interface Channel {
  id: string;
  name: string;
}

interface PendingAttachment {
  file: File;
  previewUrl?: string;
  uploading?: boolean;
  uploaded?: { url: string; type: string; filename: string; size: number };
}

interface Report {
  id: string;
  title: string;
  month: number;
  year: number;
  pdfUrl: string | null;
}

interface FullChatWindowProps {
  clientId?: string;
  conversationKey?: string;
  initialChannelId?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function attachmentIcon(type: string) {
  if (type === "IMAGE") return <ImageIcon className="w-4 h-4" />;
  if (type === "VIDEO") return <FileVideo className="w-4 h-4" />;
  if (type === "AUDIO") return <Music className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FullChatWindow({ clientId, conversationKey, initialChannelId }: FullChatWindowProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(initialChannelId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [renamingChannelId, setRenamingChannelId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  const scopeParam = conversationKey
    ? `conversationKey=${encodeURIComponent(conversationKey)}`
    : clientId ? `clientId=${clientId}` : "";

  const fetchChannels = useCallback(async () => {
    if (!scopeParam) return;
    const res = await fetch(`/api/portal/channels?${scopeParam}`);
    if (res.ok) {
      const data = await res.json() as Channel[];
      setChannels(data);
      // Only auto-select first channel if nothing is selected yet
      setActiveChannelId(prev => prev ?? (data[0]?.id ?? null));
    }
  }, [scopeParam]);

  const fetchMessages = useCallback(async () => {
    if (!activeChannelId || !scopeParam) return;
    // Append channelId directly to the already-encoded scopeParam string — avoid re-encoding
    const res = await fetch(`/api/portal/chat?${scopeParam}&channelId=${encodeURIComponent(activeChannelId)}`);
    if (res.ok) setMessages(await res.json() as Message[]);
  }, [activeChannelId, scopeParam]);

  useEffect(() => {
    setChannels([]);
    setActiveChannelId(null);
    setMessages([]);
  }, [scopeParam]);

  // Poll channels every 5 s so both parties see new channels created by the other
  useEffect(() => {
    void fetchChannels();
    const t = setInterval(() => void fetchChannels(), 5000);
    return () => clearInterval(t);
  }, [fetchChannels]);

  // Poll messages every 4 s
  useEffect(() => {
    setMessages([]);
    void fetchMessages();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => void fetchMessages(), 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Close plus menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
        setShowReportPicker(false);
      }
    }
    if (showPlusMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPlusMenu]);

  async function createChannel() {
    if (!newChannelName.trim()) return;
    const scope = conversationKey ? { conversationKey } : { clientId };
    const res = await fetch("/api/portal/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChannelName, ...scope }),
    });
    if (res.ok) {
      const ch = await res.json() as Channel;
      setChannels(prev => [...prev, ch]);
      setActiveChannelId(ch.id);
      setNewChannelName("");
      setShowNewChannel(false);
    }
  }

  async function renameChannel(id: string) {
    if (!renameValue.trim()) { setRenamingChannelId(null); return; }
    const res = await fetch(`/api/portal/channels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    if (res.ok) {
      const updated = await res.json() as Channel;
      setChannels(prev => prev.map(c => c.id === id ? updated : c));
    }
    setRenamingChannelId(null);
  }

  async function deleteChannel(id: string) {
    const res = await fetch(`/api/portal/channels/${id}`, { method: "DELETE" });
    if (res.ok) {
      setChannels(prev => prev.filter(c => c.id !== id));
      if (activeChannelId === id) {
        const remaining = channels.filter(c => c.id !== id);
        setActiveChannelId(remaining[0]?.id ?? null);
      }
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    const newPending: PendingAttachment[] = files.map(f => ({
      file: f,
      previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      uploading: true,
    }));
    setPendingAttachments(prev => [...prev, ...newPending]);
    const results = await uploadFiles("chatAttachment", { files });
    if (!results) return;
    setPendingAttachments(prev =>
      prev.map((p) => {
        const r = results.find((r: { name: string }) => r.name === p.file.name);
        if (!r) return p;
        const type = p.file.type.startsWith("image/") ? "IMAGE"
          : p.file.type.startsWith("video/") ? "VIDEO"
          : p.file.type.startsWith("audio/") ? "AUDIO"
          : "FILE";
        return { ...p, uploading: false, uploaded: { url: (r as { ufsUrl: string }).ufsUrl, type, filename: p.file.name, size: p.file.size } };
      })
    );
  }

  function removePending(idx: number) {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mr = new (window as any).MediaRecorder(stream) as MediaRecorder;
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const file: File = Object.assign(blob, { name: `voice-note-${Date.now()}.webm`, lastModified: Date.now() }) as any;
        const pending: PendingAttachment = { file, uploading: true };
        setPendingAttachments(prev => [...prev, pending]);
        const results = await uploadFiles("chatAttachment", { files: [file] });
        if (results?.[0]) {
          const uploaded = results[0] as { ufsUrl: string };
          setPendingAttachments(prev =>
            prev.map(p => p.file === file
              ? { ...p, uploading: false, uploaded: { url: uploaded.ufsUrl, type: "AUDIO", filename: file.name, size: file.size } }
              : p
            )
          );
        }
        setRecordingTime(0);
      };
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert("Microphone access denied.");
    }
  }

  async function sendMessage(overrideContent?: string, extraAttachments?: PendingAttachment[]) {
    const content = overrideContent ?? input;
    const atts = extraAttachments ?? pendingAttachments;
    if ((!content.trim() && !atts.length) || sending) return;
    const ready = atts.filter(p => p.uploaded);
    if (atts.some(p => p.uploading)) return;

    setSending(true);
    try {
      const scope = conversationKey ? { conversationKey } : { clientId };
      const res = await fetch("/api/portal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim() || null,
          channelId: activeChannelId,
          ...scope,
          replyToId: replyTo?.id ?? null,
          attachments: ready.map(p => p.uploaded!),
        }),
      });
      if (res.ok) {
        const msg = await res.json() as Message;
        setMessages(prev => [...prev, msg]);
        if (!overrideContent) { setInput(""); setPendingAttachments([]); }
        setReplyTo(null);
      }
    } finally {
      setSending(false);
    }
  }

  async function editMessage(id: string) {
    if (!editContent.trim()) { setEditingMessageId(null); return; }
    const res = await fetch(`/api/portal/chat/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      const updated = await res.json() as Message;
      setMessages(prev => prev.map(m => m.id === id ? updated : m));
    }
    setEditingMessageId(null);
  }

  async function deleteMessage(id: string) {
    const res = await fetch(`/api/portal/chat/${id}`, { method: "DELETE" });
    if (res.ok) setMessages(prev => prev.filter(m => m.id !== id));
  }

  function startReply(msg: Message) {
    setReplyTo({ id: msg.id, content: msg.content, sender: msg.sender });
    inputRef.current?.focus();
  }

  function startEdit(msg: Message) {
    setEditingMessageId(msg.id);
    setEditContent(msg.content ?? "");
  }

  async function loadReports() {
    const res = await fetch(`/api/reports?clientId=${clientId}`);
    if (res.ok) {
      const data = await res.json() as { data: Report[] };
      setReports(data.data ?? []);
    }
    setShowReportPicker(true);
  }

  async function sendReport(report: Report) {
    const line = report.pdfUrl
      ? `📋 **${report.title}** — ${MONTHS[report.month - 1]} ${report.year}\n${report.pdfUrl}`
      : `📋 **${report.title}** — ${MONTHS[report.month - 1]} ${report.year}`;
    await sendMessage(line, []);
    setShowReportPicker(false);
    setShowPlusMenu(false);
  }

  async function sendAnalyticsLink() {
    await sendMessage(`📊 Here's a link to view your analytics: [Open Analytics](/portal/analytics)`, []);
    setShowPlusMenu(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
    if (e.key === "Escape") setReplyTo(null);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  let lastDate = "";

  return (
    <div className="flex h-full border border-border rounded-xl overflow-hidden bg-card relative">
      {/* Mobile overlay behind sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 sm:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Channel sidebar */}
      <div className={cn(
        "shrink-0 border-r border-border flex flex-col bg-card/50 transition-all duration-200",
        "w-52",
        // On mobile: absolutely positioned overlay; on sm+: always visible
        "absolute inset-y-0 left-0 z-30 sm:relative sm:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
      )}>
        <div className="px-3 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(false)}
              className="sm:hidden w-5 h-5 rounded flex items-center justify-center hover:bg-accent text-muted-foreground"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowNewChannel(v => !v)}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-accent text-muted-foreground"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showNewChannel && (
          <div className="px-2 py-2 border-b border-border flex gap-1">
            <Input
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") void createChannel(); if (e.key === "Escape") setShowNewChannel(false); }}
              placeholder="channel-name"
              className="h-7 text-xs px-2"
              autoFocus
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => void createChannel()}>+</Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {channels.map(ch => (
            <div
              key={ch.id}
              className="relative mx-1 group/ch"
              onMouseEnter={() => setHoveredChannelId(ch.id)}
              onMouseLeave={() => setHoveredChannelId(null)}
            >
              {renamingChannelId === ch.id ? (
                <div className="flex items-center gap-1 px-2 py-1">
                  <Input
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") void renameChannel(ch.id);
                      if (e.key === "Escape") setRenamingChannelId(null);
                    }}
                    className="h-6 text-xs px-1.5"
                    autoFocus
                  />
                  <button onClick={() => void renameChannel(ch.id)} className="text-primary"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setRenamingChannelId(null)} className="text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => { setActiveChannelId(ch.id); setSidebarOpen(false); }}
                    onDoubleClick={() => { setRenamingChannelId(ch.id); setRenameValue(ch.name); }}
                    className={cn(
                      "flex items-center gap-1.5 w-full px-3 py-1.5 text-sm rounded-md text-left transition-colors pr-14",
                      activeChannelId === ch.id
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </button>
                  {hoveredChannelId === ch.id && (
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button
                        onClick={() => { setRenamingChannelId(ch.id); setRenameValue(ch.name); }}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Rename"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => void deleteChannel(ch.id)}
                        className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {channels.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">No channels yet.</p>
          )}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="shrink-0 h-11 border-b border-border flex items-center px-3 gap-2">
          <button
            className="sm:hidden p-1.5 rounded hover:bg-accent text-muted-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="w-4 h-4" />
          </button>
          <Hash className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm truncate">
            {channels.find(c => c.id === activeChannelId)?.name ?? "Select a channel"}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {!activeChannelId && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select or create a channel to start chatting.
            </div>
          )}
          {messages.map(msg => {
            const isMine = msg.senderId === currentUserId;
            const date = formatDate(msg.createdAt);
            const showDate = date !== lastDate;
            lastDate = date;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground">{date}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div
                  className={cn("flex gap-2.5 group relative", isMine ? "flex-row-reverse" : "flex-row")}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                    {(msg.sender.name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className={cn("flex flex-col gap-1 max-w-[70%]", isMine ? "items-end" : "items-start")}>
                    <div className="flex items-baseline gap-2">
                      {!isMine && <span className="text-xs font-semibold">{msg.sender.name}</span>}
                      <span className="text-[10px] text-muted-foreground/60">{formatTime(msg.createdAt)}</span>
                      {msg.editedAt && <span className="text-[10px] text-muted-foreground/40 italic">edited</span>}
                    </div>

                    {/* Reply preview */}
                    {msg.replyTo && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-l-2 border-primary/40 bg-primary/5 text-xs text-muted-foreground max-w-full">
                        <CornerUpLeft className="w-3 h-3 shrink-0 text-primary/40" />
                        <span className="font-medium text-primary/60 shrink-0">{msg.replyTo.sender.name}</span>
                        <span className="truncate">{msg.replyTo.content ?? "Attachment"}</span>
                      </div>
                    )}

                    {/* Inline edit mode */}
                    {editingMessageId === msg.id ? (
                      <div className="flex flex-col gap-1 w-full">
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void editMessage(msg.id); }
                            if (e.key === "Escape") setEditingMessageId(null);
                          }}
                          rows={2}
                          className="text-sm resize-none"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <button onClick={() => void editMessage(msg.id)} className="text-xs text-primary hover:underline">Save</button>
                          <span className="text-xs text-muted-foreground">·</span>
                          <button onClick={() => setEditingMessageId(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.content && (
                          <div
                            onClick={() => { if (isMine) startEdit(msg); }}
                            className={cn(
                              "px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
                              isMine
                                ? "bg-primary text-primary-foreground rounded-br-sm cursor-pointer hover:opacity-90"
                                : "bg-accent text-foreground rounded-bl-sm"
                            )}
                          >
                            {msg.content}
                          </div>
                        )}
                      </>
                    )}

                    {msg.attachments.map(att => (
                      <div key={att.id} className="rounded-xl overflow-hidden">
                        {att.type === "IMAGE" ? (
                          <a href={att.url} target="_blank" rel="noopener noreferrer">
                            <img src={att.url} alt={att.filename} className="max-w-xs max-h-64 object-cover rounded-xl" />
                          </a>
                        ) : att.type === "VIDEO" ? (
                          <video src={att.url} controls className="max-w-xs rounded-xl" />
                        ) : att.type === "AUDIO" ? (
                          <div className="bg-accent rounded-xl px-3 py-2 flex items-center gap-2">
                            <Music className="w-4 h-4 text-primary shrink-0" />
                            <audio src={att.url} controls className="h-8 max-w-[200px]" />
                          </div>
                        ) : (
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2 hover:bg-accent/80 transition-colors">
                            <File className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-medium truncate max-w-[160px]">{att.filename}</p>
                              <p className="text-[10px] text-muted-foreground">{formatSize(att.size)}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Hover actions */}
                  {hoveredMessageId === msg.id && editingMessageId !== msg.id && (
                    <div className={cn(
                      "absolute top-0 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-sm px-1 py-0.5",
                      isMine ? "left-10" : "right-10"
                    )}>
                      <button onClick={() => startReply(msg)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Reply">
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      {isMine && (
                        <>
                          <button onClick={() => startEdit(msg)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => void deleteMessage(msg.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className="shrink-0 border-t border-border px-4 py-2 flex flex-wrap gap-2">
            {pendingAttachments.map((p, i) => (
              <div key={i} className="relative flex items-center gap-1.5 bg-accent rounded-lg px-2 py-1.5">
                {p.previewUrl
                  ? <img src={p.previewUrl} alt="" className="w-8 h-8 object-cover rounded" />
                  : <div className="text-muted-foreground">{attachmentIcon(p.uploaded?.type ?? "FILE")}</div>
                }
                <div className="text-xs">
                  <p className="truncate max-w-[100px] font-medium">{p.file.name}</p>
                  {p.uploading && <p className="text-muted-foreground">Uploading…</p>}
                </div>
                <button onClick={() => removePending(i)} className="ml-1 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reply banner */}
        {replyTo && (
          <div className="shrink-0 border-t border-border px-4 py-2 flex items-center gap-2 bg-accent/30">
            <CornerUpLeft className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-primary">{replyTo.sender.name}</span>
              <span className="text-xs text-muted-foreground ml-2 truncate">{replyTo.content ?? "Attachment"}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="shrink-0 border-t border-border p-3 flex items-end gap-2">
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip" className="hidden" onChange={handleFileChange} />

          {/* "+" menu */}
          <div className="relative shrink-0" ref={plusMenuRef}>
            <button
              onClick={() => { setShowPlusMenu(o => !o); setShowReportPicker(false); }}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="More actions"
            >
              <Plus className="w-4 h-4" />
            </button>

            {showPlusMenu && (
              <div className="absolute bottom-full mb-2 left-0 bg-popover border border-border rounded-xl shadow-lg w-48 overflow-hidden z-50">
                {showReportPicker ? (
                  <div>
                    <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                      <button onClick={() => setShowReportPicker(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-semibold">Choose report</span>
                    </div>
                    {reports.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-3 py-3">No reports yet.</p>
                    ) : (
                      reports.map(r => (
                        <button
                          key={r.id}
                          onClick={() => void sendReport(r)}
                          className="flex flex-col w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                        >
                          <span className="text-xs font-medium">{r.title}</span>
                          <span className="text-[10px] text-muted-foreground">{MONTHS[r.month - 1]} {r.year}</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <>
                    <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-accent transition-colors text-sm">
                      <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" /> Attach file
                    </button>
                    <button onClick={() => { void toggleRecording(); setShowPlusMenu(false); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-accent transition-colors text-sm">
                      <Mic className="w-4 h-4 text-muted-foreground shrink-0" /> Voice note
                    </button>
                    <button onClick={() => { void loadReports(); }} className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-accent transition-colors text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" /> Share report
                    </button>
                    <button onClick={() => void sendAnalyticsLink()} className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-accent transition-colors text-sm">
                      <BarChart3 className="w-4 h-4 text-muted-foreground shrink-0" /> Share analytics
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {recording && (
            <div className="flex items-center gap-1.5 shrink-0">
              <MicOff
                className="w-4 h-4 text-red-500 cursor-pointer"
                onClick={() => void toggleRecording()}
              />
              <span className="text-xs text-red-500 font-mono">{recordingTime}s</span>
            </div>
          )}

          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeChannelId ? "Message…  (Enter to send, Shift+Enter for new line)" : "Select a channel first"}
            disabled={!activeChannelId}
            rows={1}
            className="flex-1 resize-none min-h-[38px] max-h-40 text-sm"
          />

          <Button
            size="icon"
            onClick={() => void sendMessage()}
            disabled={(!input.trim() && !pendingAttachments.length) || sending || pendingAttachments.some(p => p.uploading)}
            className="shrink-0 h-9 w-9"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
