import { cn } from "@halo/utils";
import { Gauge } from "lucide-react";

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Gauge className="h-5 w-5" />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">Halo</span>
          <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            Apex Motors · BKC
          </span>
        </div>
      )}
    </div>
  );
}

export function brandClass(collapsed: boolean) {
  return cn("transition-all", collapsed ? "px-2" : "px-4");
}
