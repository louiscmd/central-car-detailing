"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Zap, Loader2, Search, BriefcaseBusiness, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Step = "role" | "details" | "username" | "manager";
type Role = "manager" | "client";

interface ManagerResult {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Username step (client flow only)
  const [usernameValue, setUsernameValue] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // Manager search state (client flow only)
  const [managerQuery, setManagerQuery] = useState("");
  const [managerResults, setManagerResults] = useState<ManagerResult[]>([]);
  const [searchingManager, setSearchingManager] = useState(false);
  const [selectedManager, setSelectedManager] = useState<ManagerResult | null>(null);
  const [linkingPortal, setLinkingPortal] = useState(false);

  function pickRole(r: Role) {
    setRole(r);
    setStep("details");
  }

  async function handleDetails(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: role === "client" ? "CLIENT" : "USER",
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast({ title: "Registration failed", description: data.error ?? "Please try again.", variant: "destructive" });
        return;
      }

      if (role === "manager") {
        // Sign in and go to dashboard
        const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
        if (result?.error) {
          toast({ title: "Sign in failed", description: "Account created. Please sign in manually.", variant: "destructive" });
          router.push("/login");
        } else {
          router.push("/dashboard");
        }
      } else {
        // Client: sign in, then pick username, then manager
        const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
        if (result?.error) {
          toast({ title: "Sign in failed", description: "Account created. Please sign in and set up your portal.", variant: "destructive" });
          router.push("/login");
        } else {
          setStep("username");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function claimUsername(skip = false) {
    if (!skip) {
      if (usernameValue.length < 3) {
        toast({ title: "Username too short", description: "At least 3 characters required.", variant: "destructive" });
        return;
      }
      setSavingUsername(true);
      try {
        const res = await fetch("/api/settings/username", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: usernameValue }),
        });
        let data: { error?: string } = {};
        try { data = await res.json() as { error?: string }; } catch { /* non-JSON body */ }
        if (!res.ok) {
          toast({ title: "Couldn't save username", description: data.error ?? `Error ${res.status}`, variant: "destructive" });
          setSavingUsername(false);
          return;
        }
        // Re-sign-in so the JWT is reissued with the username already in the DB.
        // The auth layout has no SessionProvider so update() isn't available here.
        await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      } catch {
        toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
        setSavingUsername(false);
        return;
      }
      setSavingUsername(false);
    }
    setStep("manager");
  }

  async function searchManagers(q: string) {
    setManagerQuery(q);
    setSelectedManager(null);
    if (q.trim().length < 2) { setManagerResults([]); return; }
    setSearchingManager(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&managerOnly=true`);
      if (res.ok) setManagerResults(await res.json() as ManagerResult[]);
    } finally {
      setSearchingManager(false);
    }
  }

  async function linkPortal() {
    if (!selectedManager?.username) return;
    setLinkingPortal(true);
    try {
      const res = await fetch("/api/auth/portal-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerUsername: selectedManager.username }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      router.push("/portal");
    } finally {
      setLinkingPortal(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-2xl tracking-tight">SocialPulse</span>
        </div>

        {/* Step 1: Role picker */}
        {step === "role" && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold">Create your account</h1>
              <p className="text-sm text-muted-foreground">Choose how you'll be using SocialPulse</p>
            </div>

            <button
              onClick={() => pickRole("manager")}
              className="w-full text-left rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all p-5 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <BriefcaseBusiness className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">I'm a Manager</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Manage client accounts, track analytics, and collaborate with your team.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => pickRole("client")}
              className="w-full text-left rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all p-5 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">I'm a Client</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    View your analytics, reports, and communicate with your manager.
                  </p>
                </div>
              </div>
            </button>

            <p className="text-sm text-muted-foreground text-center pt-1">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {/* Step 2: Account details */}
        {step === "details" && (
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg">
                {role === "manager" ? "Manager account" : "Client account"}
              </CardTitle>
              <CardDescription>
                {role === "manager"
                  ? "You'll land in the manager dashboard"
                  : "You'll connect with your manager next"}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleDetails}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {role === "manager" ? "Create manager account" : "Continue"}
                </Button>
                <button type="button" onClick={() => setStep("role")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  ← Back
                </button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Step 3 (client only): Choose nickname */}
        {step === "username" && (
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg">Choose your nickname</CardTitle>
              <CardDescription>
                Pick a @username so your manager and partners can find you easily.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
                  <Input
                    id="username"
                    className="pl-7"
                    placeholder="yourhandle"
                    value={usernameValue}
                    onChange={e => setUsernameValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    maxLength={20}
                    onKeyDown={e => { if (e.key === "Enter") void claimUsername(); }}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">3–20 characters: letters, numbers, underscores.</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={savingUsername || usernameValue.length < 3}
                onClick={() => void claimUsername()}
              >
                {savingUsername && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
              <button
                type="button"
                onClick={() => void claimUsername(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </CardFooter>
          </Card>
        )}

        {/* Step 4 (client only): Pick manager */}
        {step === "manager" && (
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-lg">Find your manager</CardTitle>
              <CardDescription>
                Search for your manager's @username to connect your portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="@manager-username"
                  value={managerQuery}
                  onChange={e => void searchManagers(e.target.value)}
                />
                {searchingManager && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {managerResults.length > 0 && !selectedManager && (
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {managerResults.map(m => (
                    <li key={m.id}>
                      <button
                        onClick={() => { setSelectedManager(m); setManagerResults([]); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          {m.avatarUrl && <AvatarImage src={m.avatarUrl} />}
                          <AvatarFallback className="bg-primary/15 text-primary text-xs">
                            {(m.name ?? m.username ?? "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.name ?? m.username}</p>
                          {m.username && <p className="text-xs text-muted-foreground">@{m.username}</p>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {managerQuery.length >= 2 && !searchingManager && managerResults.length === 0 && !selectedManager && (
                <p className="text-sm text-muted-foreground text-center py-3">No managers found for "{managerQuery}"</p>
              )}

              {selectedManager && (
                <div className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-primary/40 bg-primary/5"
                )}>
                  <Avatar className="h-9 w-9 shrink-0">
                    {selectedManager.avatarUrl && <AvatarImage src={selectedManager.avatarUrl} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {(selectedManager.name ?? selectedManager.username ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedManager.name ?? selectedManager.username}</p>
                    {selectedManager.username && <p className="text-xs text-muted-foreground">@{selectedManager.username}</p>}
                  </div>
                  <button onClick={() => setSelectedManager(null)} className="text-xs text-muted-foreground hover:text-foreground shrink-0">
                    Change
                  </button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={!selectedManager || linkingPortal}
                onClick={() => void linkPortal()}
              >
                {linkingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect &amp; go to my portal
              </Button>
              <button
                type="button"
                onClick={() => router.push("/portal")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
