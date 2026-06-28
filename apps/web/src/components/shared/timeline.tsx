import { Check, Circle, Clock, Loader2, X } from "lucide-react";
import { cn } from "@halo/utils";

export type TimelineStatus = "succeeded" | "running" | "waiting_approval" | "failed" | "pending" | "skipped";

export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  status: TimelineStatus;
}

const STATUS_CONFIG: Record<TimelineStatus, { icon: typeof Check; ring: string; dot: string }> = {
  succeeded: { icon: Check, ring: "border-emerald-200 dark:border-emerald-500/30", dot: "bg-emerald-500 text-white" },
  running: { icon: Loader2, ring: "border-blue-200 dark:border-blue-500/30", dot: "bg-blue-500 text-white" },
  waiting_approval: { icon: Clock, ring: "border-amber-200 dark:border-amber-500/30", dot: "bg-amber-500 text-white" },
  failed: { icon: X, ring: "border-red-200 dark:border-red-500/30", dot: "bg-red-500 text-white" },
  pending: { icon: Circle, ring: "border-border", dot: "bg-muted text-muted-foreground" },
  skipped: { icon: Circle, ring: "border-border", dot: "bg-muted text-muted-foreground" },
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-1">
      {items.map((item, idx) => {
        const cfg = STATUS_CONFIG[item.status];
        const Icon = cfg.icon;
        const isLast = idx === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-4">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[13px] top-7 h-[calc(100%-12px)] w-px",
                  item.status === "succeeded" ? "bg-emerald-300 dark:bg-emerald-500/40" : "bg-border",
                )}
                aria-hidden
              />
            )}
            <div
              className={cn(
                "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-card",
                cfg.ring,
              )}
            >
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", cfg.dot)}>
                <Icon className={cn("h-3 w-3", item.status === "running" && "animate-spin")} />
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.meta && <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>}
              </div>
              {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
