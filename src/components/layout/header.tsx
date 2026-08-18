"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { LogOut, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/notification-bell";

export function Header() {
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
      <div className="flex-1" />

      {/* Right */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                {(session?.user as { avatarUrl?: string })?.avatarUrl && (
                  <AvatarImage src={(session?.user as { avatarUrl?: string })?.avatarUrl ?? ""} />
                )}
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
                  {(session?.user as { username?: string })?.username
                    ? `@${(session?.user as { username?: string })?.username}`
                    : session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={isManager ? "/partners" : "/portal/partners"} className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                Partners
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={isManager ? "/settings" : "/portal/settings"} className="cursor-pointer">
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
