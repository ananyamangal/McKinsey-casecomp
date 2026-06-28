import { cn } from "@halo/utils";
import { Card, CardContent, CardHeader } from "@halo/ui";

/** Standard titled content card used across dashboards and detail pages. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  noPadding,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}) {
  return (
    <Card className={cn("shadow-card", className)}>
      {(title || action) && (
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border py-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding ? "p-0" : "pt-5", !title && "pt-5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
