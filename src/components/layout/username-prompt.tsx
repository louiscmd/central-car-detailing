"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AtSign, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export function UsernamePrompt() {
  const { data: session } = useSession();
  const router = useRouter();
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
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: `@${value.trim()} claimed!`, description: "Partners can now find you by username." });
      setDismissed(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-4 mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <AtSign className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm font-medium leading-snug">
          Claim your @username so partners can find and connect with you
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground shrink-0 ml-auto sm:hidden"
          onClick={() => setDismissed(true)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:flex-none">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
          <Input
            className="pl-6 h-9 text-sm w-full sm:w-36"
            placeholder="yourhandle"
            value={value}
            onChange={e => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            maxLength={20}
            onKeyDown={e => e.key === "Enter" && void claim()}
          />
        </div>
        <Button size="sm" className="h-9 shrink-0" onClick={() => void claim()} disabled={saving || value.length < 3}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Claim"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 text-muted-foreground shrink-0 hidden sm:flex"
          onClick={() => setDismissed(true)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
