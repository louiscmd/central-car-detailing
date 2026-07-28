"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { AtSign, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export function UsernamePrompt() {
  const { data: session, update } = useSession();
  const username = (session?.user as { username?: string })?.username;
  const [dismissed, setDismissed] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  if (username || dismissed) return null;

  async function claim() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: `@${value} claimed!`, description: "Partners can now find you by username." });
      await update();
      setDismissed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-6 mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3 flex-wrap">
      <AtSign className="w-4 h-4 text-primary shrink-0" />
      <p className="text-sm font-medium flex-1 min-w-0">
        Claim your @username to let partners find and connect with you
      </p>
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
          <Input
            className="pl-6 h-8 text-sm w-36"
            placeholder="yourhandle"
            value={value}
            onChange={e => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            maxLength={20}
            onKeyDown={e => e.key === "Enter" && claim()}
          />
        </div>
        <Button size="sm" className="h-8" onClick={claim} disabled={saving || value.length < 3}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Claim"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
