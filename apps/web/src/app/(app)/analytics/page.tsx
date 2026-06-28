"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  CircleDollarSign,
  Download,
  Smile,
  Target,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Badge,
  Progress,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from "@halo/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, type StatCardProps } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { AreaTrend, LineTrend } from "@/components/shared/charts";
import { useAnalytics } from "@/lib/api/queries";
import { ErrorState } from "@/components/shared/states";

type Accent = NonNullable<StatCardProps["accent"]>;

const KPI_META: { icon: LucideIcon; accent: Accent }[] = [
  { icon: CircleDollarSign, accent: "emerald" }, // Revenue (MTD)
  { icon: Boxes, accent: "violet" }, // Inventory Days
  { icon: Timer, accent: "blue" }, // Avg Turnaround
  { icon: Wrench, accent: "blue" }, // Technician Productivity
  { icon: Smile, accent: "amber" }, // Customer Satisfaction
  { icon: Target, accent: "emerald" }, // Forecast Accuracy
];

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
] as const;

export default function AnalyticsPage() {
  const analyticsQuery = useAnalytics();
  const { data, isLoading } = analyticsQuery;
  const [range, setRange] = useState<string>("30d");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Executive performance across revenue, operations and forecasting."
        actions={
          <>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm">
              <Download className="h-4 w-4" /> Export Report
            </Button>
          </>
        }
      />

      {analyticsQuery.isError && <ErrorState onRetry={() => analyticsQuery.refetch()} />}

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {isLoading || !data
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[128px] rounded-xl" />
            ))
          : data.kpis.map((kpi, i) => {
              const meta = KPI_META[i] ?? { icon: Target, accent: "blue" as Accent };
              return (
                <StatCard
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  icon={meta.icon}
                  deltaPct={kpi.deltaPct}
                  accent={meta.accent}
                />
              );
            })}
      </div>

      <Tabs defaultValue="Revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="Revenue">Revenue</TabsTrigger>
          <TabsTrigger value="Operations">Operations</TabsTrigger>
          <TabsTrigger value="Forecasting">Forecasting</TabsTrigger>
        </TabsList>

        {/* Revenue */}
        <TabsContent value="Revenue" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="Revenue by Month"
              description="Service & parts revenue (₹ lakhs)"
              action={<Badge variant="success">+12.4% MTD</Badge>}
            >
              {isLoading || !data ? (
                <Skeleton className="h-[240px] w-full rounded-lg" />
              ) : (
                <AreaTrend
                  data={data.revenueByMonth}
                  valueFormatter={(v) => `₹${v}L`}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Customer Satisfaction Trend"
              description="CSAT score over time (%)"
              action={<Badge variant="info">92% avg</Badge>}
            >
              {isLoading || !data ? (
                <Skeleton className="h-[240px] w-full rounded-lg" />
              ) : (
                <AreaTrend
                  data={data.satisfactionTrend}
                  color="#059669"
                  valueFormatter={(v) => `${v}%`}
                />
              )}
            </SectionCard>
          </div>
        </TabsContent>

        {/* Operations */}
        <TabsContent value="Operations" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="Average Turnaround"
              description="Days from check-in to delivery"
              action={<Badge variant="success">-8.3% faster</Badge>}
            >
              {isLoading || !data ? (
                <Skeleton className="h-[240px] w-full rounded-lg" />
              ) : (
                <LineTrend
                  data={data.turnaroundTrend}
                  valueFormatter={(v) => `${v.toFixed(1)}d`}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Technician Productivity"
              description="Utilization & completed jobs"
            >
              {isLoading || !data ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {data.technicianProductivity.map((t, i) => (
                    <motion.div
                      key={t.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{t.name}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="muted" className="text-[10px]">
                            {t.jobs} jobs
                          </Badge>
                          <span className="font-semibold text-foreground">
                            {t.utilization}%
                          </span>
                        </span>
                      </div>
                      <Progress value={t.utilization} />
                    </motion.div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        {/* Forecasting */}
        <TabsContent value="Forecasting" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="Forecast Accuracy"
              description="Demand prediction accuracy (%)"
              action={<Badge variant="success">+3.5%</Badge>}
            >
              {isLoading || !data ? (
                <Skeleton className="h-[240px] w-full rounded-lg" />
              ) : (
                <AreaTrend
                  data={data.forecastAccuracy}
                  color="#7c3aed"
                  valueFormatter={(v) => `${v}%`}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Customer Satisfaction Trend"
              description="CSAT score over time (%)"
            >
              {isLoading || !data ? (
                <Skeleton className="h-[240px] w-full rounded-lg" />
              ) : (
                <LineTrend
                  data={data.satisfactionTrend}
                  color="#0891b2"
                  valueFormatter={(v) => `${v}%`}
                />
              )}
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
