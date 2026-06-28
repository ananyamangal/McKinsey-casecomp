import { Badge, type BadgeProps } from "@halo/ui";
import { cn, humanize } from "@halo/utils";

type Variant = NonNullable<BadgeProps["variant"]>;

/** Single source of truth mapping every domain status string to a badge variant. */
const STATUS_VARIANT: Record<string, Variant> = {
  // generic
  active: "success",
  idle: "muted",
  paused: "warning",
  degraded: "danger",
  inactive: "muted",
  on_hold: "warning",
  // appointments / work orders
  scheduled: "info",
  confirmed: "info",
  in_progress: "info",
  completed: "success",
  delivered: "success",
  ready: "success",
  quality_check: "warning",
  awaiting_parts: "warning",
  open: "info",
  no_show: "danger",
  cancelled: "muted",
  occupied: "info",
  maintenance: "warning",
  // inventory
  healthy: "success",
  low: "warning",
  critical: "danger",
  overstock: "info",
  dead: "muted",
  // PO
  draft: "muted",
  pending_approval: "warning",
  approved: "info",
  ordered: "info",
  partially_received: "warning",
  received: "success",
  // invoice
  issued: "info",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
  void: "muted",
  // workflow
  pending: "muted",
  running: "info",
  waiting_approval: "warning",
  succeeded: "success",
  failed: "danger",
  skipped: "muted",
  // generic outcomes
  executed: "success",
  suggested: "info",
  rejected: "danger",
  awaiting_approval: "warning",
  success: "success",
};

const PULSE_STATUSES = new Set(["in_progress", "running", "active", "occupied"]);

export function StatusBadge({
  status,
  label,
  className,
  pulse,
}: {
  status: string;
  label?: string;
  className?: string;
  pulse?: boolean;
}) {
  const variant = STATUS_VARIANT[status] ?? "muted";
  const showPulse = pulse ?? PULSE_STATUSES.has(status);
  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {showPulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label ?? humanize(status)}
    </Badge>
  );
}
