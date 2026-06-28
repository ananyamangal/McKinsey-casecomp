import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@halo/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
        danger:
          "border-transparent bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
        info: "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
        muted:
          "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
