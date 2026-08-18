"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, FileText, BarChart3, Menu, X, Settings, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PortalSidebar({ clientName, hasAnalytics }: { clientName: string; hasAnalytics: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/portal", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/portal/chat", label: "Chat", icon: MessageSquare },
    { href: "/portal/reports", label: "Reports", icon: FileText },
    ...(hasAnalytics ? [{ href: "/portal/analytics", label: "Analytics", icon: BarChart3 }] : []),
    { href: "/portal/partners", label: "Partners", icon: Users },
    { href: "/portal/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md border border-border bg-card"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full z-40 w-56 bg-card border-r border-border flex flex-col transition-transform duration-200",
        "md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Client name header */}
        <div className="p-5 border-b border-border">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm mb-2">
            {clientName.slice(0, 2).toUpperCase()}
          </div>
          <p className="font-semibold text-sm truncate">{clientName}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(item => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
        </nav>
      </aside>
    </>
  );
}
