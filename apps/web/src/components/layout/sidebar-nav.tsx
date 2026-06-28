"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@halo/utils";
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "@halo/ui";
import { NAV_ITEMS } from "@/lib/navigation";

export function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const primary = NAV_ITEMS.filter((i) => i.section === "primary");
  const system = NAV_ITEMS.filter((i) => i.section === "system");

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    const link = (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          collapsed && "justify-center px-0",
          active
            ? "bg-sidebar-accent text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && item.badge && (
          <Badge variant="info" className="h-5 px-1.5 text-[10px]">
            {item.badge}
          </Badge>
        )}
      </Link>
    );

    if (!collapsed) return link;
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {!collapsed && (
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Operations
        </p>
      )}
      {primary.map(renderItem)}
      <div className="my-2 h-px bg-sidebar-border" />
      {!collapsed && (
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          System
        </p>
      )}
      {system.map(renderItem)}
    </nav>
  );
}
