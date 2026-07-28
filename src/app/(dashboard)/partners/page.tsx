"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, Check, X, Clock, Link2, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

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
  linkedClientId: string | null;
  inviter?: UserResult;
  invitee?: UserResult;
}

function Initials(name: string | null, username: string | null) {
  const src = name ?? username ?? "?";
  return src.slice(0, 2).toUpperCase();
}

export default function PartnersPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const [partnerships, setPartnerships] = useState<{ sent: Partnership[]; received: Partnership[] }>({ sent: [], received: [] });
  const [loadingPartnerships, setLoadingPartnerships] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    loadPartnerships();
  }, []);

  async function loadPartnerships() {
    setLoadingPartnerships(true);
    try {
      const res = await fetch("/api/partnerships");
      if (res.ok) setPartnerships(await res.json());
    } finally {
      setLoadingPartnerships(false);
    }
  }

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function sendInvite(username: string) {
    setSending(username);
    try {
      const res = await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, message: message || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setSent(s => new Set([...s, username]));
      toast({ title: "Invite sent!", description: `Partnership invite sent to @${username}.` });
      await loadPartnerships();
    } finally {
      setSending(null);
    }
  }

  async function respond(id: string, action: "accept" | "decline") {
    setResponding(id);
    try {
      const res = await fetch(`/api/partnerships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast({ title: action === "accept" ? "Partnership accepted!" : "Invite declined" });
        await loadPartnerships();
      } else {
        const d = await res.json();
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } finally {
      setResponding(null);
    }
  }

  async function removePartnership(id: string) {
    await fetch(`/api/partnerships/${id}`, { method: "DELETE" });
    await loadPartnerships();
  }

  const pendingReceived = partnerships.received.filter(p => p.status === "PENDING");
  const acceptedAll = [
    ...partnerships.sent.filter(p => p.status === "ACCEPTED"),
    ...partnerships.received.filter(p => p.status === "ACCEPTED"),
  ];
  const pendingSent = partnerships.sent.filter(p => p.status === "PENDING");

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Partners</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect with other managers and clients by @username. Partners can chat, share reports, and view analytics.
        </p>
      </div>

      {/* Pending invites (received) */}
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
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">
                    {Initials(p.inviter?.name ?? null, p.inviter?.username ?? null)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.inviter?.name ?? p.inviter?.username}</p>
                  {p.inviter?.username && <p className="text-xs text-muted-foreground">@{p.inviter.username}</p>}
                  {p.message && <p className="text-xs text-muted-foreground italic mt-0.5">"{p.message}"</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    disabled={responding === p.id}
                    onClick={() => respond(p.id, "accept")}
                  >
                    {responding === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={responding === p.id}
                    onClick={() => respond(p.id, "decline")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find a partner</CardTitle>
          <CardDescription>Search by @username or display name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="@username or name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {message === "" && (
                <Textarea
                  placeholder="Add a message (optional)..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="text-sm resize-none"
                  rows={2}
                />
              )}
              {message !== "" && (
                <Textarea
                  placeholder="Add a message (optional)..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="text-sm resize-none"
                  rows={2}
                />
              )}
              <ul className="space-y-1">
                {results.map(u => {
                  const alreadySent = sent.has(u.username ?? "") ||
                    partnerships.sent.some(p => p.invitee?.id === u.id) ||
                    partnerships.received.some(p => p.inviter?.id === u.id);
                  return (
                    <li key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors">
                      <Avatar className="h-9 w-9 shrink-0">
                        {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                        <AvatarFallback className="bg-primary/15 text-primary text-xs">
                          {Initials(u.name, u.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u.name ?? u.username}</p>
                        {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={alreadySent ? "outline" : "default"}
                        disabled={alreadySent || sending === (u.username ?? u.id)}
                        onClick={() => u.username && sendInvite(u.username)}
                      >
                        {sending === (u.username ?? u.id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : alreadySent ? (
                          <><Clock className="w-3 h-3 mr-1" />Sent</>
                        ) : (
                          <><UserPlus className="w-3 h-3 mr-1" />Invite</>
                        )}
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

      {/* Active Partners */}
      {acceptedAll.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              Active partners ({acceptedAll.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {acceptedAll.map(p => {
              const them = p.inviter ?? p.invitee;
              return (
                <div key={p.id} className="flex items-center gap-3 px-1">
                  <Avatar className="h-9 w-9 shrink-0">
                    {them?.avatarUrl && <AvatarImage src={them.avatarUrl} />}
                    <AvatarFallback className="bg-green-500/15 text-green-600 text-xs">
                      {Initials(them?.name ?? null, them?.username ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{them?.name ?? them?.username}</p>
                    {them?.username && <p className="text-xs text-muted-foreground">@{them.username}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.linkedClientId && (
                      <Link href={`/clients/${p.linkedClientId}/chat`}>
                        <Button size="sm" variant="outline">
                          <Link2 className="w-3 h-3 mr-1" />
                          Chat
                        </Button>
                      </Link>
                    )}
                    <Badge variant="outline" className="text-green-500 border-green-500/30 text-[10px]">
                      Connected
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pending sent */}
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
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {Initials(p.invitee?.name ?? null, p.invitee?.username ?? null)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.invitee?.name ?? p.invitee?.username}</p>
                  {p.invitee?.username && <p className="text-xs text-muted-foreground">@{p.invitee.username}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => removePartnership(p.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loadingPartnerships && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
