"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn, formatRelativeTime } from "@halo/utils";
import { Badge, Button, ScrollArea } from "@halo/ui";
import { useNotifications } from "@/lib/api/queries";
import { useMarkAllNotificationsRead, useMarkNotificationRead } from "@/lib/api/mutations";
import { useUIStore } from "@/lib/store/ui-store";
import type { NotificationSeverity } from "@halo/types";

const SEVERITY_STYLE: Record<
  string,
  { icon: typeof Info; className: string }
> = {
  info: { icon: Info, className: "text-blue-500 bg-blue-50 dark:bg-blue-500/10" },
  success: { icon: CheckCircle2, className: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
  warning: { icon: AlertTriangle, className: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
  critical: { icon: XCircle, className: "text-red-500 bg-red-50 dark:bg-red-500/10" },
};

export function NotificationPanel() {
  const { notificationsOpen, setNotificationsOpen } = useUIStore();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {notificationsOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNotificationsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-elevated"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2">
                <Bell className="h-[18px] w-[18px] text-foreground" />
                <h2 className="text-sm font-semibold">Notifications</h2>
                {unread > 0 && <Badge variant="danger">{unread} new</Badge>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {notifications.map((n) => {
                  const style = SEVERITY_STYLE[n.severity as NotificationSeverity] ?? SEVERITY_STYLE.info!;
                  const Icon = style.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.read) markRead.mutate(n.id);
                      }}
                      disabled={markRead.isPending}
                      className={cn(
                        "flex gap-3 border-b border-border px-5 py-4 text-left transition-colors hover:bg-accent/40 disabled:cursor-default",
                        !n.read && "bg-primary/[0.03]",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          style.className,
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant="muted" className="text-[10px]">
                            {n.module}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t border-border p-3">
              <Button
                variant="outline"
                className="w-full"
                disabled={unread === 0 || markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                {markAllRead.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Mark all as read
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
