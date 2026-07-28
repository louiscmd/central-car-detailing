"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: { id: string; name: string; role: string };
}

interface ChatWindowProps {
  clientId: string;
  currentUserId: string;
  currentUserName: string;
}

export function ChatWindow({ clientId, currentUserId, currentUserName }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/chat");
      if (res.ok) {
        const data = await res.json() as Message[];
        setMessages(data);
      }
    } catch {
      // silently ignore polling errors
    }
  }, []);

  useEffect(() => {
    void fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/portal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (res.ok) {
        const msg = await res.json() as Message;
        setMessages(prev => [...prev, msg]);
        setInput("");
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
    <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-card min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No messages yet. Start the conversation!
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
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground">{date}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <div className={cn("flex flex-col gap-0.5", isMine ? "items-end" : "items-start")}>
                {!isMine && (
                  <span className="text-[10px] text-muted-foreground ml-1">{msg.sender.name}</span>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-accent text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground/60 mx-1">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          className="flex-1 resize-none min-h-[38px] max-h-32 text-sm"
        />
        <Button
          size="icon"
          onClick={() => void sendMessage()}
          disabled={!input.trim() || sending}
          className="shrink-0 h-9 w-9"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
