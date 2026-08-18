"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, Check, X, Clock, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface UserResult {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface Partnership {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  message: string | null;
  createdAt: string;
  inviter?: UserResult;
  invitee?: UserResult;
}

function initials(name: string | null, username: string | null) {
  return (name ?? username ?? "?").slice(0, 2).toUpperCase();
}

export default function PortalPartnersPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [partnerships, setPartnerships] = useState<{ sent: Partnership[]; received: Partnership[] }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/partnerships");
    if (res.ok) setPartnerships(await res.json() as typeof partnerships);
    setLoading(false);
  }

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json() as UserResult[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function sendInvite(username: string) {
    setSending(username);
    const res = await fetch("/api/partnerships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, message: message || undefined }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) { toast({ title: "Error", description: data.error, variant: "destructive" }); }
    else { setSent(s => new Set([...s, username])); toast({ title: "Invite sent!" }); await load(); }
    setSending(null);
  }

  async function respond(id: string, action: "accept" | "decline") {
    setResponding(id);
    const res = await fetch(`/api/partnerships/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) { toast({ title: action === "accept" ? "Partnership accepted!" : "Declined" }); await load(); }
    setResponding(null);
  }

  async function cancel(id: string) {
    await fetch(`/api/partnerships/${id}`, { method: "DELETE" });
    await load();
  }

  const pendingReceived = partnerships.received.filter(p => p.status === "PENDING");
  const accepted = [
    ...partnerships.sent.filter(p => p.status === "ACCEPTED"),
    ...partnerships.received.filter(p => p.status === "ACCEPTED"),
  ];
  const pendingSent = partnerships.sent.filter(p => p.status === "PENDING");

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold">Partners</h2>
        <p className="text-sm text-muted-foreground mt-1">Connect with managers and collaborators by @username.</p>
      </div>

      {pendingReceived.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Pending invites ({pendingReceived.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingReceived.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  {p.inviter?.avatarUrl && <AvatarImage src={p.inviter.avatarUrl} />}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(p.inviter?.name ?? null, p.inviter?.username ?? null)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.inviter?.name ?? p.inviter?.username}</p>
                  {p.inviter?.username && <p className="text-xs text-muted-foreground">@{p.inviter.username}</p>}
                  {p.message && <p className="text-xs text-muted-foreground italic mt-0.5">"{p.message}"</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" disabled={responding === p.id} onClick={() => void respond(p.id, "accept")}>
                    {responding === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="outline" disabled={responding === p.id} onClick={() => void respond(p.id, "decline")}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find a partner</CardTitle>
          <CardDescription>Search by @username or name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="@username or name..." value={query} onChange={e => setQuery(e.target.value)} />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          {results.length > 0 && (
            <div className="space-y-2">
              <Textarea placeholder="Add a message (optional)..." value={message} onChange={e => setMessage(e.target.value)} className="text-sm resize-none" rows={2} />
              <ul className="space-y-1">
                {results.map(u => {
                  const alreadySent = sent.has(u.username ?? "") ||
                    partnerships.sent.some(p => p.invitee?.id === u.id) ||
                    partnerships.received.some(p => p.inviter?.id === u.id);
                  return (
                    <li key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors">
                      <Avatar className="h-9 w-9 shrink-0">
                        {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                        <AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(u.name, u.username)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u.name ?? u.username}</p>
                        {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={alreadySent ? "outline" : "default"}
                        disabled={alreadySent || sending === (u.username ?? u.id)}
                        onClick={() => u.username && void sendInvite(u.username)}
                      >
                        {sending === (u.username ?? u.id) ? <Loader2 className="w-3 h-3 animate-spin" />
                          : alreadySent ? <><Clock className="w-3 h-3 mr-1" />Sent</>
                          : <><UserPlus className="w-3 h-3 mr-1" />Invite</>}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {query.length >= 2 && !searching && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No users found for "{query}"</p>
          )}
        </CardContent>
      </Card>

      {accepted.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" /> Active partners ({accepted.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {accepted.map(p => {
              const them = p.inviter ?? p.invitee;
              return (
                <div key={p.id} className="flex items-center gap-3 px-1">
                  <Avatar className="h-9 w-9 shrink-0">
                    {them?.avatarUrl && <AvatarImage src={them.avatarUrl} />}
                    <AvatarFallback className="bg-green-500/15 text-green-600 text-xs">{initials(them?.name ?? null, them?.username ?? null)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{them?.name ?? them?.username}</p>
                    {them?.username && <p className="text-xs text-muted-foreground">@{them.username}</p>}
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500/30 text-[10px] shrink-0">Connected</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {pendingSent.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">Sent invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingSent.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-1">
                <Avatar className="h-9 w-9 shrink-0">
                  {p.invitee?.avatarUrl && <AvatarImage src={p.invitee.avatarUrl} />}
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials(p.invitee?.name ?? null, p.invitee?.username ?? null)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.invitee?.name ?? p.invitee?.username}</p>
                  {p.invitee?.username && <p className="text-xs text-muted-foreground">@{p.invitee.username}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => void cancel(p.id)}>Cancel</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
    </div>
  );
}
