"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface SyncResult {
  ok: boolean;
  pageName?: string;
  conversations?: number;
  leads?: number;
  matched?: number;
  alreadyHad?: number;
  unmatched?: number;
  error?: string;
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  async function syncPsids() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/facebook/sync-psids", { method: "POST" });
      const data: SyncResult = await res.json();
      setSyncResult(data);
    } catch {
      setSyncResult({ ok: false, error: "Network error. Try again." });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    if (!form.email && !form.newPassword) {
      toast({ title: "Nothing to update", description: "Enter a new email or password." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          ...(form.email && { email: form.email }),
          ...(form.newPassword && { newPassword: form.newPassword }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      toast({ title: "Profile updated! Please sign in again." });
      setForm({ email: "", currentPassword: "", newPassword: "", confirmPassword: "" });
      await update();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and dashboard preferences.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xl">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <p className="font-semibold">{session?.user?.name}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Email / Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Email or Password</CardTitle>
          <CardDescription>
            Leave fields blank if you don't want to change them.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>New Email</Label>
              <Input
                type="email"
                placeholder={session?.user?.email ?? ""}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                placeholder="Repeat new password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Current Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                placeholder="Required to make any changes"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </form>
      </Card>

      {/* Scraping Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scraping Configuration</CardTitle>
          <CardDescription>
            Control how the system scrapes public profiles. Higher delays = less risk of rate limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Delay (ms)</Label>
              <Input type="number" defaultValue={2000} disabled />
            </div>
            <div className="space-y-2">
              <Label>Max Delay (ms)</Label>
              <Input type="number" defaultValue={5000} disabled />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure via environment variables <code className="bg-muted px-1 rounded">SCRAPE_MIN_DELAY_MS</code> and{" "}
            <code className="bg-muted px-1 rounded">SCRAPE_MAX_DELAY_MS</code>.
          </p>
        </CardContent>
      </Card>

      {/* Scheduler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Scrape Scheduler</CardTitle>
          <CardDescription>
            Daily scraping runs automatically at 3:00 AM by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Daily Auto-Scrape</p>
              <p className="text-xs text-muted-foreground">
                Cron schedule: <code className="bg-muted px-1 rounded">0 3 * * *</code>
              </p>
            </div>
            <Switch defaultChecked disabled />
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Run <code className="bg-muted px-1 rounded">npm run scheduler</code> in a separate process to activate the cron scheduler.
          </p>
        </CardContent>
      </Card>

      {/* Facebook Page — Read Receipts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facebook Page — Read Receipts</CardTitle>
          <CardDescription>
            Sync your Facebook Page conversations to automatically detect when leads have read your DMs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-2 text-sm">
            <p className="font-medium">How it works</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
              <li>Click <strong>Sync Conversations</strong> — we fetch all your Facebook Page conversations and link each contact's ID to their lead in Deal Tracker.</li>
              <li>From then on, whenever someone reads your message, Facebook sends our webhook a read receipt and we automatically move that lead into the <strong>Seen – No Reply</strong> column.</li>
              <li>Re-run the sync any time you add new leads or want to refresh the matches.</li>
            </ol>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm mb-2">Required Vercel env vars</p>
            <p><code className="bg-muted px-1 rounded">FACEBOOK_PAGE_ACCESS_TOKEN</code> — your Page access token (with <code>pages_messaging</code> permission)</p>
            <p><code className="bg-muted px-1 rounded">FACEBOOK_VERIFY_TOKEN</code> — any secret string you set in the Facebook App webhook config</p>
            <p className="mt-2">Webhook URL to register in Facebook App: <code className="bg-muted px-1 rounded">{typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"}/api/webhooks/facebook</code></p>
            <p className="mt-1">Subscribe to the <strong>messages</strong> and <strong>message_reads</strong> events.</p>
          </div>

          <button
            onClick={syncPsids}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? "Syncing conversations…" : "Sync Conversations"}
          </button>

          {syncResult && (
            <div className={`flex items-start gap-3 rounded-lg p-3 border text-sm ${syncResult.ok ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"}`}>
              {syncResult.ok
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
              <div className="space-y-0.5">
                {syncResult.ok ? (
                  <>
                    <p className="font-medium text-green-400">Sync complete — {syncResult.pageName}</p>
                    <p className="text-xs text-muted-foreground">
                      {syncResult.conversations} conversations scanned · {syncResult.matched} new leads linked · {syncResult.alreadyHad} already had IDs · {syncResult.unmatched} unmatched
                    </p>
                  </>
                ) : (
                  <p className="text-destructive">{syncResult.error}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About SocialPulse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Version: 0.1.0</p>
            <p>Tracks publicly visible social media analytics using surface-level data only.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
