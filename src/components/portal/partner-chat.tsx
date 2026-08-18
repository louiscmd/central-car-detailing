"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FullChatWindow } from "@/components/portal/full-chat-window";

interface Partner {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

function convKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

function initials(name: string | null, username: string | null) {
  return (name ?? username ?? "?").slice(0, 2).toUpperCase();
}

export function PartnerChat() {
  const { data: session } = useSession();
  const myId = session?.user?.id ?? "";

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  useEffect(() => {
    fetch("/api/partnerships")
      .then(r => r.json())
      .then((data: { sent: { status: string; invitee: Partner }[]; received: { status: string; inviter: Partner }[] }) => {
        const list: Partner[] = [
          ...data.sent.filter(p => p.status === "ACCEPTED").map(p => p.invitee),
          ...data.received.filter(p => p.status === "ACCEPTED").map(p => p.inviter),
        ];
        const seen = new Set<string>();
        const deduped = list.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
        setPartners(deduped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPartner = partners.find(p => p.id === selectedId) ?? null;
  const key = myId && selectedId ? convKey(myId, selectedId) : null;

  function selectPartner(id: string) {
    setSelectedId(id);
    setMobileView("chat");
  }

  // ── Mobile: full-screen list → full-screen chat ──────────────────────────
  // ── Desktop: icon-only sidebar + chat panel ──────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Desktop icon sidebar ── */}
      <div className="hidden sm:flex flex-col w-[60px] shrink-0 border-r border-border bg-card/60 py-2 gap-1 items-center overflow-y-auto">
        {loading && (
          <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
        )}
        {!loading && partners.length === 0 && (
          <div className="flex items-center justify-center h-full pb-8">
            <MessageSquare className="w-5 h-5 text-muted-foreground/30" />
          </div>
        )}
        {partners.map(p => (
          <button
            key={p.id}
            onClick={() => selectPartner(p.id)}
            title={p.name ?? p.username ?? "Partner"}
            className={cn(
              "relative group rounded-full transition-all duration-150",
              selectedId === p.id
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                : "opacity-70 hover:opacity-100 hover:scale-105"
            )}
          >
            <Avatar className="h-9 w-9">
              {p.avatarUrl && <AvatarImage src={p.avatarUrl} />}
              <AvatarFallback className={cn(
                "text-xs font-bold",
                selectedId === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {initials(p.name, p.username)}
              </AvatarFallback>
            </Avatar>
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-popover border border-border px-2 py-1 text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {p.name ?? p.username}
            </span>
          </button>
        ))}
      </div>

      {/* ── Desktop chat area ── */}
      <div className="hidden sm:flex flex-1 min-w-0 flex-col">
        {key ? (
          <FullChatWindow conversationKey={key} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a partner to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile: partner list ── */}
      {mobileView === "list" && (
        <div className="sm:hidden flex flex-col flex-1 min-w-0 bg-background">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-base font-bold">Messages</h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {loading && (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted animate-pulse rounded w-1/3" />
                    <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                  </div>
                </div>
              ))
            )}
            {!loading && partners.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No partners yet. Add partners to start chatting.</p>
              </div>
            )}
            {partners.map(p => (
              <button
                key={p.id}
                onClick={() => selectPartner(p.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 active:bg-accent transition-colors"
              >
                <Avatar className="h-12 w-12 shrink-0">
                  {p.avatarUrl && <AvatarImage src={p.avatarUrl} />}
                  <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                    {initials(p.name, p.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name ?? p.username}</p>
                  {p.username && (
                    <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Mobile: chat view ── */}
      {mobileView === "chat" && (
        <div className="sm:hidden flex flex-col flex-1 min-w-0">
          {/* Back bar */}
          <div className="shrink-0 h-12 border-b border-border flex items-center px-2 gap-2 bg-background">
            <button
              onClick={() => setMobileView("list")}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {selectedPartner && (
              <>
                <Avatar className="h-7 w-7 shrink-0">
                  {selectedPartner.avatarUrl && <AvatarImage src={selectedPartner.avatarUrl} />}
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                    {initials(selectedPartner.name, selectedPartner.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">{selectedPartner.name ?? selectedPartner.username}</p>
                  {selectedPartner.username && (
                    <p className="text-[10px] text-muted-foreground leading-tight">@{selectedPartner.username}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {key && (
            <div className="flex-1 min-h-0">
              <FullChatWindow conversationKey={key} />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
