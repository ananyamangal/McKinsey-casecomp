"use client";

import { Bell, ChevronDown, Menu, Search, Settings, UserRound } from "lucide-react";
import { initials } from "@halo/utils";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from "@halo/ui";
import { humanize } from "@halo/utils";
import { useUIStore } from "@/lib/store/ui-store";
import { useNotifications } from "@/lib/api/queries";
import { useAuthStore } from "@/lib/store/auth-store";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  const { toggleNotifications, toggleMobileSidebar } = useUIStore();
  const { data: notifications } = useNotifications();
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  const user = useAuthStore((s) => s.user);
  const displayName = user?.fullName ?? "—";
  const role = user?.roles?.[0] ?? "user";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggleMobileSidebar}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers, vehicles, parts, invoices…"
          className="h-9 w-full pl-9 pr-16"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={toggleNotifications}
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 h-9 gap-2 pl-1.5 pr-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{initials(displayName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">{displayName}</span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{displayName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email ?? ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <div className="px-2 pb-1.5">
              <Badge variant="muted">{humanize(role)}</Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserRound /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings /> Preferences
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
