"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Settings,
  Zap,
  Menu,
  X,
  Download,
  TrendingUp,
  MapPin,
  Kanban,
  CheckSquare,
  Home,
  MessageSquare,
  UserPlus,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const navSections = [
  {
    label: null,
    items: [
      { href: "/welcome", label: "Biz Hub", icon: Home },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/clients", label: "Monitoring", icon: Users },
      { href: "/partners", label: "Partners", icon: UserPlus },
      { href: "/chat", label: "Chat", icon: MessageSquare },
      { href: "/tasks", label: "Daily Checklist", icon: CheckSquare },
    ],
  },
  {
    label: "Toolbox",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/deals", label: "Deal Tracker", icon: Kanban },
      { href: "/revenue-estimator", label: "Revenue Estimator", icon: TrendingUp },
      { href: "/territory", label: "Territory Tracker", icon: MapPin },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin", label: "Admin panel", icon: ShieldCheck },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateWaiting, setUpdateWaiting] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
    setIsInstalled(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | undefined;

    function checkForUpdate() {
      reg?.update().catch(() => {});
    }

    navigator.serviceWorker.getRegistration().then((r) => {
      if (!r) return;
      reg = r;

      if (r.waiting) setUpdateWaiting(true);

      r.addEventListener("updatefound", () => {
        const newWorker = r.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateWaiting(true);
          }
        });
      });

      // Check immediately, then every 60 s
      checkForUpdate();
      const interval = setInterval(checkForUpdate, 60_000);

      // Also check when the user focuses the tab
      const onVisible = () => { if (document.visibilityState === "visible") checkForUpdate(); };
      document.addEventListener("visibilitychange", onVisible);

      return () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisible);
      };
    });

    // When the new SW takes over, reload
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      window.open("https://support.google.com/chrome/answer/9658361", "_blank");
      return;
    }
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
  }

  async function handleUpdate() {
    setUpdating(true);
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-40 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200",
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">SocialPulse</span>
          </Link>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3">
          <nav className="px-3 space-y-4">
            {navSections.map((section, si) => (
              <div key={si}>
                {section.label && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.filter((item) => {
                    if (item.href === "/admin") return role === "ADMIN";
                    return true;
                  }).map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          {updateWaiting && (
            <button
              onClick={() => void handleUpdate()}
              disabled={updating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4 shrink-0", updating && "animate-spin")} />
              {updating ? "Updating…" : "Update available"}
            </button>
          )}
          {!isInstalled && (
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Download className="w-4 h-4 shrink-0" />
              Install App
            </button>
          )}
          <p className="text-xs text-muted-foreground text-center">
            SocialPulse v0.9
          </p>
        </div>
      </aside>
    </>
  );
}
