"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@halo/utils";
import { Card } from "@halo/ui";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  deltaPct?: number;
  hint?: string;
  spark?: number[];
  accent?: "blue" | "emerald" | "amber" | "violet" | "rose";
  className?: string;
}

const ACCENTS: Record<NonNullable<StatCardProps["accent"]>, { icon: string; chart: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400", chart: "#2563eb" },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    chart: "#059669",
  },
  amber: { icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", chart: "#d97706" },
  violet: {
    icon: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    chart: "#7c3aed",
  },
  rose: { icon: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400", chart: "#e11d48" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  deltaPct,
  hint,
  spark,
  accent = "blue",
  className,
}: StatCardProps) {
  const accentStyle = ACCENTS[accent];
  const positive = (deltaPct ?? 0) >= 0;
  const sparkData = spark?.map((v, i) => ({ i, v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -3 }}
    >
      <Card className={cn("group relative overflow-hidden p-5 shadow-card transition-shadow hover:shadow-elevated", className)}>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accentStyle.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {deltaPct !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                positive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(deltaPct).toFixed(1)}%
            </span>
          )}
          {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-12 opacity-70">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentStyle.chart} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={accentStyle.chart} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={accentStyle.chart}
                  strokeWidth={2}
                  fill={`url(#spark-${label})`}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
