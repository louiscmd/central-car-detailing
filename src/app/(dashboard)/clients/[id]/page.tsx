"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  Pause,
  Play,
  ExternalLink,
  StickyNote,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/clients/platform-badge";
import { toast } from "@/hooks/use-toast";
import { formatNumber, formatDate, platformLabel } from "@/lib/utils";
import type { Platform } from "@/types";

interface Account {
  id: string;
  platform: Platform;
  username: string;
  profileUrl: string;
  displayName: string | null;
  avatarUrl: string | null;
  isPaused: boolean;
  lastScraped: string | null;
  snapshots: { followers: bigint | null; date: string }[];
}

interface Client {
  id: string;
  name: string;
  notes: string | null;
  tags: string[];
  isPaused: boolean;
  accounts: Account[];
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapingAccount, setScrapingAccount] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    platform: "INSTAGRAM" as Platform,
    username: "",
    profileUrl: "",
  });

  async function fetchClient() {
    const res = await fetch(`/api/clients/${id}`);
    if (!res.ok) { router.push("/clients"); return; }
    const { data } = await res.json();
    setClient(data);
    setLoading(false);
  }

  useEffect(() => { fetchClient(); }, [id]);

  async function handleScrapeAll() {
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: id }),
      });
      const { data } = await res.json();
      const success = data.filter((r: { success: boolean }) => r.success).length;
      toast({ title: `Scraped ${success}/${data.length} accounts successfully` });
      fetchClient();
    } finally {
      setScraping(false);
    }
  }

  async function handleAddAccount() {
    const res = await fetch(`/api/clients/${id}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (!res.ok) {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
      return;
    }
    toast({ title: "Account added!" });
    setAddOpen(false);
    setAddForm({ platform: "INSTAGRAM", username: "", profileUrl: "" });
    fetchClient();
  }

  async function handleDeleteAccount(accountId: string) {
    await fetch(`/api/clients/${id}/accounts?accountId=${accountId}`, {
      method: "DELETE",
    });
    toast({ title: "Account removed" });
    fetchClient();
  }

  async function togglePause() {
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaused: !client?.isPaused }),
    });
    fetchClient();
  }

  async function handleScrapeAccount(accountId: string) {
    setScrapingAccount(accountId);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const { data } = await res.json();
      if (data?.success) {
        toast({ title: "Account scraped successfully" });
      } else {
        toast({ title: "Scrape failed", description: data?.error, variant: "destructive" });
      }
      fetchClient();
    } finally {
      setScrapingAccount(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this client and all its data? This cannot be undone.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    router.push("/clients");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              {client.isPaused && (
                <Badge variant="secondary">Paused</Badge>
              )}
            </div>
            {client.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {client.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScrapeAll}
            disabled={scraping || client.isPaused}
          >
            {scraping ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Analytics
          </Button>
          <Link href={`/analytics?clientId=${id}`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
          >
            {client.isPaused ? (
              <><Play className="w-4 h-4 mr-2" /> Resume</>
            ) : (
              <><Pause className="w-4 h-4 mr-2" /> Pause</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardContent className="p-4 flex gap-3">
            <StickyNote className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Social Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Social Accounts</CardTitle>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Social Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select
                    value={addForm.platform}
                    onValueChange={(v) =>
                      setAddForm({ ...addForm, platform: v as Platform })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["INSTAGRAM", "TIKTOK", "FACEBOOK", "YOUTUBE"] as Platform[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {platformLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    placeholder="@username"
                    value={addForm.username}
                    onChange={(e) =>
                      setAddForm({ ...addForm, username: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Profile URL</Label>
                  <Input
                    placeholder="https://instagram.com/username"
                    value={addForm.profileUrl}
                    onChange={(e) =>
                      setAddForm({ ...addForm, profileUrl: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleAddAccount} className="w-full">
                  Add Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {client.accounts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No social accounts yet. Add one to start tracking.
            </div>
          ) : (
            <div className="space-y-3">
              {client.accounts.map((account) => {
                const latestFollowers = account.snapshots?.[0]?.followers;
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/50 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlatformBadge platform={account.platform} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {account.displayName ?? account.username}
                        </p>
                        <a
                          href={account.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                        >
                          @{account.username}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {latestFollowers ? formatNumber(Number(latestFollowers)) : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {account.lastScraped
                            ? formatDate(account.lastScraped)
                            : "Not scraped"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleScrapeAccount(account.id)}
                        disabled={scrapingAccount === account.id}
                        title="Scrape now"
                      >
                        {scrapingAccount === account.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
