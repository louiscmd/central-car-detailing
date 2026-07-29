"use client";

import { usePush } from "@/hooks/use-push";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export function PushToggle() {
  const { state, subscribe, unsubscribe } = usePush();
  const [testing, setTesting] = useState(false);

  async function handleToggle(checked: boolean) {
    if (checked) {
      const ok = await subscribe();
      if (ok) toast({ title: "Push notifications enabled!" });
      else toast({ title: "Could not enable notifications", variant: "destructive" });
    } else {
      await unsubscribe();
      toast({ title: "Push notifications disabled" });
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "test", body: "This is a test notification from SocialPulse." }),
      });
      const data = await res.json();
      if (!res.ok) toast({ title: "Error", description: data.error, variant: "destructive" });
      else toast({ title: "Test notification sent!", description: "Check your device." });
    } finally {
      setTesting(false);
    }
  }

  if (state === "unsupported") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <BellOff className="w-4 h-4" />
        Push notifications are not supported in this browser.
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <BellOff className="w-4 h-4 text-destructive" />
        <span>Notifications are blocked. Allow them in your browser/OS settings, then reload.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {state === "subscribed" ? (
            <BellRing className="w-4 h-4 text-primary" />
          ) : (
            <Bell className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {state === "subscribed" ? "Push notifications on" : "Enable push notifications"}
            </p>
            <p className="text-xs text-muted-foreground">
              {state === "subscribed"
                ? "You'll get notified for partnership invites, new messages, and more."
                : "Get notified on this device for invites, messages, and reports."}
            </p>
          </div>
        </div>
        {state === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={state === "subscribed"}
            onCheckedChange={handleToggle}
          />
        )}
      </div>

      {state === "subscribed" && (
        <Button
          variant="outline"
          size="sm"
          onClick={sendTest}
          disabled={testing}
        >
          {testing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <BellRing className="w-3 h-3 mr-2" />}
          Send test notification
        </Button>
      )}
    </div>
  );
}
