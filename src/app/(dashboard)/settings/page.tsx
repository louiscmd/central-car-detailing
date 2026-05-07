"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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
