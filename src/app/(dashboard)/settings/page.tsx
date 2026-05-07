"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);

  const scrapeSettings = {
    minDelay: parseInt(process.env.NEXT_PUBLIC_SCRAPE_MIN_DELAY ?? "2000"),
    maxDelay: parseInt(process.env.NEXT_PUBLIC_SCRAPE_MAX_DELAY ?? "5000"),
  };

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
              <Input
                type="number"
                defaultValue={scrapeSettings.minDelay}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Max Delay (ms)</Label>
              <Input
                type="number"
                defaultValue={scrapeSettings.maxDelay}
                disabled
              />
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
            On Vercel, use cron job triggers or a separate service.
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
            <p>
              Tracks publicly visible social media analytics using surface-level data only.
              No private API access, no authentication bypassing.
            </p>
            <p className="text-xs">
              Data is scraped from public profile pages with respectful rate limiting and delays.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
