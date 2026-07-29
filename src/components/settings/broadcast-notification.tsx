"use client";

import { useState } from "react";
import { Send, Loader2, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Client { id: string; name: string; portalUserId?: string | null; }

export function BroadcastNotification({ clients }: { clients: Client[] }) {
  const [target, setTarget] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setSending(true);
    try {
      const res = await fetch("/api/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, title, body, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to send", description: data.error, variant: "destructive" });
      } else {
        toast({ title: `Sent to ${data.sent} of ${data.total} user(s)` });
        setTitle(""); setBody(""); setUrl("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Target */}
      <div className="space-y-2">
        <Label>Send to</Label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTarget("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${target === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
          >
            <Users className="w-3 h-3" /> Everyone
          </button>
          <button
            onClick={() => setTarget("clients")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${target === "clients" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
          >
            <User className="w-3 h-3" /> Clients only
          </button>
          {clients.map(c => (
            c.portalUserId && (
              <button
                key={c.id}
                onClick={() => setTarget(`user:${c.portalUserId}`)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${target === `user:${c.portalUserId}` ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
              >
                {c.name}
              </button>
            )
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          placeholder="New report available"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
        />
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label>Message <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          placeholder="Your October report is ready to view."
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={2}
          className="resize-none"
          maxLength={200}
        />
      </div>

      {/* URL */}
      <div className="space-y-2">
        <Label>Tap destination <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          placeholder="/portal/reports"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
      </div>

      <Button onClick={send} disabled={sending || !title.trim()}>
        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Send notification
      </Button>
    </div>
  );
}
