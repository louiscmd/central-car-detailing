"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Loader2, Lock, Mail, User, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function PortalSettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const user = session?.user as { id?: string; name?: string; email?: string; username?: string } | undefined;

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setUsername(user?.username ?? "");
  }, [user?.name, user?.username]);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/settings/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(name.trim() && { name: name.trim() }),
          ...(username.trim() && { username: username.trim() }),
        }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) {
        toast({ title: "Error", description: d.error, variant: "destructive" });
        return;
      }
      toast({ title: "Profile updated" });
      // Only pass fields that are actually set so we don't wipe existing values
      const patch: Record<string, string> = {};
      if (name.trim()) patch.name = name.trim();
      if (username.trim()) patch.username = username.trim();
      await update(patch);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json() as { error?: string };
      if (res.ok) {
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        toast({ title: "Password updated" });
      } else {
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label>Username</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="yourhandle"
                maxLength={20}
              />
            </div>
            <p className="text-xs text-muted-foreground">3–20 characters, letters/numbers/underscores. Used by others to find you.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="opacity-50" />
            <p className="text-xs text-muted-foreground">Contact your manager to change your email.</p>
          </div>
          <Button
            onClick={() => void saveProfile()}
            disabled={savingProfile || (!name.trim() && !username.trim())}
            className="w-full"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save profile
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" /> Change password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm new password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <Button
            className="w-full"
            onClick={() => void savePassword()}
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Update password
          </Button>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}

function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/delete-account", { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast({ title: "Error", description: d.error, variant: "destructive" });
        return;
      }
      await signOut({ callbackUrl: "/login" });
    } finally {
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" className="w-full text-muted-foreground text-xs" onClick={() => setConfirming(true)}>
        Delete account
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs text-destructive font-medium">This permanently deletes your account and all data. Are you sure?</p>
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" className="flex-1" disabled={deleting} onClick={() => void handleDelete()}>
          {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Yes, delete
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => setConfirming(false)}>Cancel</Button>
      </div>
    </div>
  );
}
