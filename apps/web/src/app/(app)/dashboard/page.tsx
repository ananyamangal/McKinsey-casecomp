"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Boxes,
  CalendarCheck,
  CircleDollarSign,
  Download,
  Plus,
  Smile,
  Sparkles,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatMoney, money } from "@halo/utils";
import { Badge, Button } from "@halo/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { AreaTrend, BarSeries, DonutChart, ChartLegend } from "@/components/shared/charts";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { ProgressRing } from "@/components/shared/progress-ring";
import { StatusBadge } from "@/components/shared/status-badge";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useActivity, useAgents, useDashboard, useWorkflows } from "@/lib/api/queries";
import { ErrorState } from "@/components/shared/states";

export default function DashboardPage() {
  const dashboardQuery = useDashboard();
  const { data: d } = dashboardQuery;
  const { data: agents = [] } = useAgents();
  const { data: activity = [] } = useActivity();
  const { data: workflows = [] } = useWorkflows();

  const activeWorkflows = workflows.filter(
    (w) => w.status === "running" || w.status === "waiting_approval",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good morning, Rohan"
        description="Here's what's happening across Apex Motors today — Saturday, 28 June 2026."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4" /> New Work Order
            </Button>
          </>
        }
      />

      {dashboardQuery.isError && <ErrorState onRetry={() => dashboardQuery.refetch()} />}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Revenue Today"
          value={
            d ? (
              <AnimatedCounter
                value={d.revenueToday / 100}
                format={(n) => formatMoney(money(Math.round(n) * 100), { compact: true })}
              />
            ) : (
              "—"
            )
          }
          icon={CircleDollarSign}
          deltaPct={d?.revenueDeltaPct}
          hint="vs yesterday"
          accent="emerald"
          spark={[12, 18, 14, 22, 19, 26, 24, 30]}
        />
        <StatCard
          label="Workshop Utilization"
          value={d ? <AnimatedCounter value={d.workshopUtilization} format={(n) => `${Math.round(n)}%`} /> : "—"}
          icon={Wrench}
          deltaPct={5.2}
          hint="6 of 8 bays active"
          accent="blue"
          spark={[60, 64, 58, 72, 70, 76, 74, 78]}
        />
        <StatCard
          label="Inventory Health"
          value={d ? <AnimatedCounter value={d.inventoryHealthPct} format={(n) => `${Math.round(n)}%`} /> : "—"}
          icon={Boxes}
          deltaPct={-2.1}
          hint={`${d?.pendingOrders ?? 0} reorders pending`}
          accent="violet"
          spark={[80, 78, 82, 79, 76, 74, 72, 71]}
        />
        <StatCard
          label="Customer Satisfaction"
          value={d ? <AnimatedCounter value={d.customerSatisfaction} format={(n) => `${Math.round(n)}%`} /> : "—"}
          icon={Smile}
          deltaPct={2.1}
          hint="CSAT, last 30 days"
          accent="amber"
          spark={[88, 89, 90, 91, 90, 92, 92, 93]}
        />
        <StatCard
          label="Appointments Today"
          value={d ? <AnimatedCounter value={d.appointmentsToday} /> : "—"}
          icon={CalendarCheck}
          deltaPct={8.0}
          hint="4 awaiting check-in"
          accent="blue"
        />
        <StatCard
          label="Finance Alerts"
          value={d ? <AnimatedCounter value={d.financeAlerts} /> : "—"}
          icon={TriangleAlert}
          deltaPct={-12.5}
          hint="overdue + unsynced"
          accent="rose"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Revenue Trend"
          description="Monthly service & parts revenue"
          className="lg:col-span-2"
          action={<Badge variant="success">+12.4% YoY</Badge>}
        >
          {d && <AreaTrend data={d.revenueTrend} valueFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />}
        </SectionCard>
        <SectionCard title="Service Mix" description="By appointment volume">
          {d && (
            <div className="space-y-4">
              <DonutChart data={d.serviceMix} height={180} />
              <ChartLegend data={d.serviceMix} />
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Inventory Forecast"
          description="Predicted parts consumption (units / week)"
          className="lg:col-span-2"
        >
          {d && <BarSeries data={d.inventoryForecast} />}
        </SectionCard>
        <SectionCard title="Workshop Timeline" description="Live bay status">
          <div className="space-y-3">
            {d?.workshopTimeline.slice(0, 6).map((bay) => (
              <div key={bay.bay} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">{bay.bay}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${bay.status === "occupied" ? bay.progress : 0}%` }}
                  />
                </div>
                <StatusBadge status={bay.status} className="w-[88px] justify-center" />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* AI Command Center */}
      <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/[0.07] via-card to-card shadow-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  AI Command Center
                </h2>
                <Badge variant="success">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                  </span>
                  Live
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Aria, Vault and Cipher are running {activeWorkflows} workflow
                {activeWorkflows === 1 ? "" : "s"} right now.
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="gap-2 shadow-sm">
            <Link href="/ai-center">
              <Bot className="h-5 w-5" /> Go to AI Center
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          {agents.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-muted/40" />
              ))
            : agents.map((agent, i) => {
                const Icon = AGENT_ICON[agent.key] ?? Bot;
                return (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    whileHover={{ y: -3 }}
                  >
                    <Link
                      href="/ai-center"
                      className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                            <p className="text-xs text-muted-foreground">{agent.domain}</p>
                          </div>
                        </div>
                        <StatusBadge status={agent.status} />
                      </div>

                      <div className="flex items-center gap-4">
                        <ProgressRing
                          value={Math.round(agent.confidence * 100)}
                          size={56}
                          strokeWidth={6}
                        />
                        <div className="flex-1 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Running tasks</span>
                            <span className="font-semibold text-foreground">{agent.runningTasks}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Queued</span>
                            <span className="font-semibold text-foreground">
                              {agent.queuedDecisions}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Success rate</span>
                            <span className="font-semibold text-foreground">
                              {agent.successRatePct}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto rounded-lg bg-muted/50 p-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Current workflow
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                          {agent.currentWorkflow ?? "Idle — monitoring"}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
        </div>
      </div>

      {/* AI + activity row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="AI Recommendations"
          description="Proactive actions suggested by your agents"
          className="lg:col-span-2"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ai-center">
                AI Center <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {RECOMMENDATIONS.map((rec, i) => (
              <motion.div
                key={rec.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <Badge variant="muted" className="text-[10px]">
                    {rec.agent}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">{rec.title}</p>
                <p className="text-xs text-muted-foreground">{rec.body}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Button size="sm" className="h-7 text-xs">
                    {rec.cta}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                    Dismiss
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" description="Across all modules">
          <ActivityFeed events={activity.slice(0, 7)} />
        </SectionCard>
      </div>
    </div>
  );
}

/** Maps each agent to its domain icon for the AI Command Center band. */
const AGENT_ICON: Record<string, LucideIcon> = {
  aria: Wrench,
  vault: Boxes,
  cipher: CircleDollarSign,
};

const RECOMMENDATIONS = [
  {
    agent: "Aria",
    title: "5 vehicles due for proactive brake service",
    body: "Telematics shows brake pad life under 25%. Estimated ₹72,500 revenue if booked this week.",
    cta: "Review & book",
  },
  {
    agent: "Vault",
    title: "Reorder 3 critical SKUs before weekend",
    body: "Brake Pad Set, Oil Filter and 12V Battery are below safety stock with rising demand.",
    cta: "Approve PO draft",
  },
  {
    agent: "Cipher",
    title: "₹1.4L outstanding across 6 invoices",
    body: "Send WhatsApp payment reminders. 2 invoices crossed their due date yesterday.",
    cta: "Send reminders",
  },
  {
    agent: "Aria",
    title: "12 customers haven't visited in 6 months",
    body: "Launch a win-back campaign with a complimentary inspection offer.",
    cta: "Create campaign",
  },
];
