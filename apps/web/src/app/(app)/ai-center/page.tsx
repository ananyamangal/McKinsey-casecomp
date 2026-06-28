"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Boxes,
  Brain,
  CheckCircle2,
  CircleDollarSign,
  Cpu,
  Gauge,
  History,
  ListChecks,
  MemoryStick,
  PauseCircle,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  UserCheck,
  Workflow as WorkflowIcon,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn, formatRelativeTime, formatTime } from "@halo/utils";
import { Badge, Button, Progress, Skeleton } from "@halo/ui";
import { Loader2 } from "lucide-react";
import type {
  Agent,
  AgentAction,
  AgentDecision,
  ApprovalRequest,
  RetryQueueItem,
  WorkflowExecution,
} from "@halo/types";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { EmptyState } from "@/components/shared/states";
import {
  useAgentActions,
  useAgents,
  useApprovals,
  useDecisions,
  useRetryQueue,
  useWorkflows,
} from "@/lib/api/queries";
import { useApproveWorkflow, useRetryWorkflow } from "@/lib/api/mutations";
import { ErrorState } from "@/components/shared/states";

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

const AGENT_ICON: Record<string, LucideIcon> = {
  aria: Wrench,
  vault: Boxes,
  cipher: CircleDollarSign,
};

function relative(iso?: string): string {
  if (!iso) return "—";
  return formatRelativeTime(iso);
}

function riskVariant(risk: ApprovalRequest["riskLevel"]): "info" | "warning" | "danger" {
  if (risk === "high") return "danger";
  if (risk === "medium") return "warning";
  return "info";
}

function outcomePct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/* -------------------------------------------------------------------------- */
/* small building blocks                                                       */
/* -------------------------------------------------------------------------- */

function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-1.5 w-1.5", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ResourceBar({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "blue" | "violet";
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="w-14 shrink-0 text-[11px] font-medium text-muted-foreground">{label}</span>
      <Progress
        value={value}
        className="h-1.5 flex-1"
        indicatorClassName={tone === "blue" ? "bg-blue-500" : "bg-violet-500"}
      />
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {Math.round(value)}%
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* agent card                                                                  */
/* -------------------------------------------------------------------------- */

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const Icon = AGENT_ICON[agent.key] ?? Bot;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-lg"
    >
      <div className="flex flex-col gap-4 p-5">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{agent.name}</p>
              <p className="truncate text-xs text-muted-foreground">{agent.domain}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusBadge status={agent.status} pulse />
            <Badge variant={agent.autonomous ? "info" : "muted"} className="text-[10px]">
              {agent.autonomous ? "Autonomous" : "Suggest only"}
            </Badge>
          </div>
        </div>

        {/* confidence ring + stat tiles */}
        <div className="flex items-center gap-4">
          <ProgressRing
            value={agent.confidence * 100}
            size={76}
            strokeWidth={7}
            label={
              <div className="flex flex-col items-center leading-none">
                <span className="text-base font-semibold text-foreground">
                  {Math.round(agent.confidence * 100)}%
                </span>
                <span className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                  conf
                </span>
              </div>
            }
          />
          <div className="grid flex-1 grid-cols-2 gap-2">
            <StatTile label="Running" value={agent.runningTasks} />
            <StatTile label="Queued" value={agent.queuedDecisions} />
            <StatTile label="Actions" value={agent.actionsToday} />
            <StatTile label="Success" value={`${Math.round(agent.successRatePct)}%`} />
          </div>
        </div>

        {/* current workflow + last decision */}
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <div className="flex items-start gap-2">
            <WorkflowIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="text-xs text-foreground">
              <span className="text-muted-foreground">Current: </span>
              {agent.currentWorkflow ?? "Idle — no active workflow"}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {agent.lastDecision ?? "No recent decisions"}
            </p>
          </div>
          <p className="pl-5 text-[11px] text-muted-foreground">Last action {relative(agent.lastActionAt)}</p>
        </div>

        {/* health + resources */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="w-14 shrink-0 text-[11px] font-medium text-muted-foreground">Health</span>
            <Progress
              value={agent.healthPct}
              className="h-1.5 flex-1"
              indicatorClassName={cn(
                agent.healthPct >= 80 ? "bg-emerald-500" : agent.healthPct >= 50 ? "bg-amber-500" : "bg-red-500",
              )}
            />
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
              {Math.round(agent.healthPct)}%
            </span>
          </div>
          <ResourceBar icon={Cpu} label="CPU" value={agent.cpuPct} tone="blue" />
          <ResourceBar icon={MemoryStick} label="Memory" value={agent.memoryPct} tone="violet" />
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* page                                                                        */
/* -------------------------------------------------------------------------- */

export default function AiCenterPage() {
  const agentsQuery = useAgents();
  const { data: agents = [], isLoading: agentsLoading } = agentsQuery;
  const { data: decisions = [], isLoading: decisionsLoading } = useDecisions();
  const { data: actions = [], isLoading: actionsLoading } = useAgentActions();
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows();
  const { data: approvals = [], isLoading: approvalsLoading } = useApprovals();
  const { data: retryQueue = [], isLoading: retryLoading } = useRetryQueue();

  const approveWorkflow = useApproveWorkflow();
  const retryWorkflow = useRetryWorkflow();

  // default-select the most relevant (running / waiting) workflow
  const defaultWorkflowId = useMemo(() => {
    const active = workflows.find((w) => w.status === "running" || w.status === "waiting_approval");
    return active?.id ?? workflows[0]?.id;
  }, [workflows]);

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const activeId = selectedId ?? defaultWorkflowId;
  const selected: WorkflowExecution | undefined =
    workflows.find((w) => w.id === activeId) ?? workflows[0];

  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!selected) return [];
    return [...selected.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        id: step.id,
        title: step.name,
        subtitle: step.error
          ? step.error
          : step.requiresApproval
            ? "Requires human approval"
            : undefined,
        meta:
          step.durationMs != null
            ? `${(step.durationMs / 1000).toFixed(1)}s`
            : step.startedAt
              ? relative(step.startedAt)
              : undefined,
        status: step.status,
      }));
  }, [selected]);

  // immutable-looking audit log derived from decisions + actions
  const auditEntries = useMemo(() => {
    const fromDecisions = decisions.map((d) => ({
      id: `d-${d.id}`,
      at: d.createdAt,
      actor: d.agentName,
      action: `Decision ${d.outcome.replace(/_/g, " ")} — ${d.summary}`,
    }));
    const fromActions = actions.map((a) => ({
      id: `a-${a.id}`,
      at: a.createdAt,
      actor: a.agentKey,
      action: `${a.description} (${a.module})`,
    }));
    return [...fromDecisions, ...fromActions]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 10);
  }, [decisions, actions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Center"
        description="Autonomous operations command center"
        actions={
          <>
            <Button variant="outline" size="sm">
              <PauseCircle className="h-4 w-4" /> Pause All Agents
            </Button>
            <Badge variant="success" className="gap-1.5">
              <LiveDot />
              All systems operational
            </Badge>
          </>
        }
      />

      {/* ----------------------------- agent cards ---------------------------- */}
      {agentsQuery.isError ? (
        <ErrorState onRetry={() => agentsQuery.refetch()} />
      ) : agentsLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[400px] rounded-xl" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState icon={Bot} title="No agents online" description="No autonomous agents are registered yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {agents.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} />
          ))}
        </div>
      )}

      {/* ------------------------- human approval queue ----------------------- */}
      <SectionCard
        title="Human Approval Queue"
        description="High-stakes actions awaiting sign-off"
        action={
          <Badge variant={approvals.length > 0 ? "warning" : "muted"}>
            {approvals.length} pending
          </Badge>
        }
      >
        {approvalsLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : approvals.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nothing needs your approval"
            description="All autonomous actions are within approved thresholds."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {approvals.map((req: ApprovalRequest, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 shrink-0 text-primary" />
                      <p className="truncate text-sm font-semibold text-foreground">{req.workflowTitle}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{req.summary}</p>
                  </div>
                  <Badge variant={riskVariant(req.riskLevel)} className="shrink-0 capitalize">
                    {req.riskLevel} risk
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {req.requestedByAgent ? (
                    <Badge variant="muted" className="text-[10px]">
                      {req.requestedByAgent}
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">{req.stepName}</span>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={approveWorkflow.isPending}
                      onClick={() => approveWorkflow.mutate(req.executionId)}
                    >
                      {approveWorkflow.isPending && approveWorkflow.variables === req.executionId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}{" "}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={approveWorkflow.isPending}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ----------------------- live execution graph ------------------------- */}
      <SectionCard
        title="Live Workflow Execution"
        description="Real-time execution graph across all running workflows"
        action={
          <Badge variant="info" className="gap-1.5">
            <LiveDot />
            {workflows.filter((w) => w.status === "running" || w.status === "waiting_approval").length} active
          </Badge>
        }
        noPadding
      >
        {workflowsLoading ? (
          <div className="p-5">
            <Skeleton className="h-72 rounded-lg" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={WorkflowIcon} title="No workflows" description="No workflow executions to display." />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
            {/* left: workflow list */}
            <div className="max-h-[460px] space-y-1.5 overflow-y-auto border-b border-border p-3 lg:border-b-0 lg:border-r">
              {workflows.map((w) => {
                const isActive = w.id === activeId;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      isActive
                        ? "border-primary/40 bg-primary/[0.06]"
                        : "border-transparent hover:border-border hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{w.title}</p>
                      <StatusBadge status={w.status} className="shrink-0 text-[10px]" />
                    </div>
                    <Progress value={w.progressPct} className="mt-2 h-1.5" />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="capitalize">Triggered by {w.triggeredBy}</span>
                      <span className="tabular-nums">{Math.round(w.progressPct)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* right: selected workflow timeline */}
            <div className="p-5">
              {selected ? (
                <>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{selected.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {selected.steps.length} steps · started {relative(selected.startedAt)} · via{" "}
                        <span className="capitalize">{selected.triggeredBy}</span>
                      </p>
                    </div>
                    <StatusBadge status={selected.status} pulse />
                  </div>
                  <Progress value={selected.progressPct} className="mb-5 h-2" />
                  {timelineItems.length > 0 ? (
                    <Timeline items={timelineItems} />
                  ) : (
                    <EmptyState icon={ListChecks} title="No steps" description="This workflow has no steps yet." />
                  )}
                </>
              ) : (
                <EmptyState icon={WorkflowIcon} title="Select a workflow" description="Choose a workflow to inspect." />
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* --------------------------- lower grid ------------------------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* decision history */}
        <SectionCard
          title="Decision History"
          description="What the agents decided and why"
          action={<Badge variant="muted">{decisions.length}</Badge>}
        >
          {decisionsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : decisions.length === 0 ? (
            <EmptyState icon={Brain} title="No decisions yet" />
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {decisions.slice(0, 8).map((d: AgentDecision) => (
                <div
                  key={d.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted" className="text-[10px]">
                        {d.agentName}
                      </Badge>
                      <StatusBadge status={d.outcome} className="text-[10px]" />
                      <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                        {outcomePct(d.confidence)} conf
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground">{d.summary}</p>
                    {d.entityLabel && (
                      <p className="truncate text-[11px] text-muted-foreground">{d.entityLabel}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{relative(d.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* agent activity feed */}
        <SectionCard
          title="Agent Activity Feed"
          description="Live stream of actions taken"
          action={
            <Badge variant="info" className="gap-1.5">
              <LiveDot /> Live
            </Badge>
          }
        >
          {actionsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : actions.length === 0 ? (
            <EmptyState icon={Activity} title="No activity" />
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {actions.slice(0, 8).map((a: AgentAction) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{a.description}</p>
                    <p className="text-[11px] text-muted-foreground">{a.module}</p>
                  </div>
                  <StatusBadge status={a.status} className="shrink-0 text-[10px]" />
                  <span className="shrink-0 text-[11px] text-muted-foreground">{relative(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* retry queue */}
        <SectionCard
          title="Retry Queue"
          description="Failed steps scheduled for automatic retry"
          action={
            <Badge variant={retryQueue.length > 0 ? "warning" : "muted"}>{retryQueue.length}</Badge>
          }
        >
          {retryLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : retryQueue.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Queue is clear" description="No failed steps awaiting retry." />
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {retryQueue.map((r: RetryQueueItem) => (
                <div key={r.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{r.workflowTitle}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.stepName}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 text-xs"
                      disabled={retryWorkflow.isPending}
                      onClick={() => retryWorkflow.mutate(r.id)}
                    >
                      {retryWorkflow.isPending && retryWorkflow.variables === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}{" "}
                      Retry now
                    </Button>
                  </div>
                  <p className="mt-1.5 truncate text-xs text-red-600 dark:text-red-400">{r.error}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      Attempt {r.attempts}/{r.maxAttempts}
                    </span>
                    <span>Next retry {relative(r.nextRetryAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* audit log */}
        <SectionCard
          title="Audit Log"
          description="Immutable record of agent activity"
          action={
            <Badge variant="muted" className="gap-1.5">
              <ScrollText className="h-3 w-3" /> append-only
            </Badge>
          }
        >
          {decisionsLoading || actionsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : auditEntries.length === 0 ? (
            <EmptyState icon={History} title="No audit records" />
          ) : (
            <div className="max-h-[360px] space-y-px overflow-y-auto rounded-lg border border-border bg-muted/20 font-mono text-[11px]">
              {auditEntries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-3 border-b border-border/60 bg-background px-3 py-2 last:border-b-0"
                >
                  <span className="shrink-0 tabular-nums text-muted-foreground">{formatTime(e.at)}</span>
                  <span className="shrink-0 font-semibold capitalize text-primary">{e.actor}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{e.action}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
