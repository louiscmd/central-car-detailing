"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PerspectiveSwitcher } from "@/components/layout/perspective-switcher";

interface ClientItem { id: string; name: string; }

interface HeaderProps {
  title?: string;
  clients?: ClientItem[];
  viewAsClientId?: string | null;
  currentClientName?: string;
}

export function Header({ title, clients = [], viewAsClientId = null, currentClientName }: HeaderProps) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const isManager = role === "USER" || role === "ADMIN";

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center px-4 md:px-6">
      {/* Left */}
      <div className="flex-1">
        {title && <h1 className="text-base font-semibold hidden md:block">{title}</h1>}
      </div>

      {/* Center — perspective switcher */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <PerspectiveSwitcher
          clients={clients}
          viewAsClientId={viewAsClientId}
          currentClientName={currentClientName}
          isManager={isManager}
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session?.user?.name ?? "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
