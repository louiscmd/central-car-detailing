"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, User } from "lucide-react";
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

  const currentLabel = viewAsClientId ? (currentClientName ?? "Client") : "Manager";
  const currentIcon = viewAsClientId ? <User className="w-3.5 h-3.5" /> : <LayoutDashboard className="w-3.5 h-3.5" />;

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

  if (!isManager) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
      >
        {currentIcon}
        <span>{currentLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-popover border border-border rounded-xl shadow-xl py-1.5 w-52">
          {/* Manager option */}
          <button
            onClick={switchToManager}
            className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${!viewAsClientId ? "text-primary font-medium" : "text-foreground"}`}
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">Manager</p>
              <p className="text-[10px] text-muted-foreground">Your dashboard</p>
            </div>
            {!viewAsClientId && <span className="ml-auto text-primary text-xs">✓</span>}
          </button>

          {clients.length > 0 && (
            <>
              <div className="my-1.5 border-t border-border" />
              <p className="px-3 pb-1 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Clients</p>
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => switchToClient(client)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${viewAsClientId === client.id ? "text-primary font-medium" : "text-foreground"}`}
                >
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="truncate">{client.name}</span>
                  {viewAsClientId === client.id && <span className="ml-auto text-primary text-xs">✓</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
