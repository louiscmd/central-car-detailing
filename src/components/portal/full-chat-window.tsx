"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, Plus, Hash, Mic, MicOff, Paperclip, X, Image as ImageIcon, FileVideo, Music, File } from "lucide-react";
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

interface Message {
  id: string;
  content: string | null;
  createdAt: string;
  senderId: string;
  channelId: string | null;
  attachments: Attachment[];
  sender: { id: string; name: string; role: string };
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

interface FullChatWindowProps {
  clientId: string;
  initialChannelId?: string;
}

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

export function FullChatWindow({ clientId, initialChannelId }: FullChatWindowProps) {
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

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);


  // Load channels
  const fetchChannels = useCallback(async () => {
    const url = `/api/portal/channels${clientId ? `?clientId=${clientId}` : ""}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json() as Channel[];
      setChannels(data);
      if (!activeChannelId && data.length > 0) {
        setActiveChannelId(data[0].id);
      }
    }
  }, [clientId, activeChannelId]);

  // Load messages for active channel
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) return;
    const params = new URLSearchParams({ channelId: activeChannelId });
    if (clientId) params.set("clientId", clientId);
    const res = await fetch(`/api/portal/chat?${params}`);
    if (res.ok) setMessages(await res.json() as Message[]);
  }, [activeChannelId, clientId]);

  useEffect(() => { void fetchChannels(); }, [fetchChannels]);
  useEffect(() => {
    setMessages([]);
    void fetchMessages();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => void fetchMessages(), 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function createChannel() {
    if (!newChannelName.trim()) return;
    const res = await fetch("/api/portal/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChannelName, clientId }),
    });
    if (res.ok) {
      const ch = await res.json() as Channel;
      setChannels(prev => [...prev, ch]);
      setActiveChannelId(ch.id);
      setNewChannelName("");
      setShowNewChannel(false);
    }
  }

  // File upload
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
        return {
          ...p,
          uploading: false,
          uploaded: { url: (r as { ufsUrl: string }).ufsUrl, type, filename: p.file.name, size: p.file.size },
        };
      })
    );
  }

  function removePending(idx: number) {
    setPendingAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  // Voice recording
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

  async function sendMessage() {
    if ((!input.trim() && !pendingAttachments.length) || sending) return;
    const ready = pendingAttachments.filter(p => p.uploaded);
    if (pendingAttachments.some(p => p.uploading)) return; // still uploading

    setSending(true);
    try {
      const res = await fetch("/api/portal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: input.trim() || null,
          channelId: activeChannelId,
          clientId,
          attachments: ready.map(p => p.uploaded!),
        }),
      });
      if (res.ok) {
        const msg = await res.json() as Message;
        setMessages(prev => [...prev, msg]);
        setInput("");
        setPendingAttachments([]);
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  let lastDate = "";

  return (
    <div className="flex h-full border border-border rounded-xl overflow-hidden bg-card">
      {/* Channel sidebar */}
      <div className="w-52 shrink-0 border-r border-border flex flex-col bg-card/50">
        <div className="px-3 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
          <button
            onClick={() => setShowNewChannel(v => !v)}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-accent text-muted-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
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
            <button
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={cn(
                "flex items-center gap-1.5 w-full px-3 py-1.5 text-sm rounded-md mx-1 text-left transition-colors",
                activeChannelId === ch.id
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
          {channels.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">No channels yet.</p>
          )}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="shrink-0 h-11 border-b border-border flex items-center px-4 gap-2">
          <Hash className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">
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
                <div className={cn("flex gap-2.5 group", isMine ? "flex-row-reverse" : "flex-row")}>
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                    {(msg.sender.name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className={cn("flex flex-col gap-1 max-w-[70%]", isMine ? "items-end" : "items-start")}>
                    <div className="flex items-baseline gap-2">
                      {!isMine && <span className="text-xs font-semibold">{msg.sender.name}</span>}
                      <span className="text-[10px] text-muted-foreground/60">{formatTime(msg.createdAt)}</span>
                    </div>
                    {msg.content && (
                      <div className={cn(
                        "px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
                        isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-accent text-foreground rounded-bl-sm"
                      )}>
                        {msg.content}
                      </div>
                    )}
                    {msg.attachments.map(att => (
                      <div key={att.id} className={cn("rounded-xl overflow-hidden", isMine ? "items-end" : "items-start")}>
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
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2 hover:bg-accent/80 transition-colors"
                          >
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

        {/* Input bar */}
        <div className="shrink-0 border-t border-border p-3 flex items-end gap-2">
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip" className="hidden" onChange={handleFileChange} />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            onClick={() => void toggleRecording()}
            className={cn(
              "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-colors",
              recording
                ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            title={recording ? `Stop (${recordingTime}s)` : "Record voice note"}
          >
            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {recording && (
            <span className="text-xs text-red-500 font-mono shrink-0">{recordingTime}s</span>
          )}

          <Textarea
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
