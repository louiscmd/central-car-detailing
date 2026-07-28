"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, User, Check } from "lucide-react";
import { setViewAsClient } from "@/app/actions/view-as";

interface Client {
  id: string;
  name: string;
}

interface PerspectiveSwitcherProps {
  clients: Client[];
  viewAsClientId: string | null;
  currentClientName?: string;
  isManager: boolean;
}

export function PerspectiveSwitcher({
  clients,
  viewAsClientId,
  currentClientName,
  isManager,
}: PerspectiveSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!isManager) return null;

  const currentLabel = viewAsClientId ? (currentClientName ?? "Client") : "Manager";

  async function switchToManager() {
    setOpen(false);
    await setViewAsClient(null);
    router.push("/dashboard");
    router.refresh();
  }

  async function switchToClient(client: Client) {
    setOpen(false);
    await setViewAsClient(client.id);
    router.push("/portal");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card hover:bg-accent transition-colors"
      >
        <span className="text-sm font-semibold">{currentLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden w-60">
          {/* Manager */}
          <button
            onClick={switchToManager}
            className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-accent transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Manager</p>
              <p className="text-xs text-muted-foreground">Your dashboard</p>
            </div>
            {!viewAsClientId && <Check className="w-4 h-4 text-primary shrink-0" />}
          </button>

          {clients.length > 0 && (
            <>
              <div className="border-t border-border mx-4" />
              <div className="px-4 pt-2.5 pb-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Client view</p>
              </div>
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => switchToClient(client)}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-accent transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0 text-xs font-bold">
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">Client portal</p>
                  </div>
                  {viewAsClientId === client.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </>
          )}

          {clients.length === 0 && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">No clients yet. Add one from the Clients page.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
