import { initials, formatRelativeTime } from "@halo/utils";
import { Avatar, AvatarFallback } from "@halo/ui";
import { Badge } from "@halo/ui";
import type { ActivityEvent } from "@halo/types";

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="relative space-y-5">
      <span className="absolute bottom-2 left-[15px] top-2 w-px bg-border" aria-hidden />
      {events.map((event) => (
        <li key={event.id} className="relative flex gap-3">
          <Avatar className="z-10 h-8 w-8 border-2 border-card">
            <AvatarFallback className="text-[10px]">{initials(event.actor)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm text-foreground">
              <span className="font-medium">{event.actor}</span>{" "}
              <span className="text-muted-foreground">{event.action}</span>{" "}
              <span className="font-medium">{event.target}</span>
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="muted" className="text-[10px]">
                {event.module}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(event.createdAt)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
