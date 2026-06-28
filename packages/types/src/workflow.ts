import type { BaseEntity, ID, ISODateString } from "./common";

/**
 * Workflow primitives. These mirror the backend Workflow Engine exactly so the
 * AI Center can render live execution state without any translation layer.
 *
 * Business logic lives in step handlers on the backend. The frontend only ever
 * reads execution state — it never encodes what a step *does*.
 */

export const WorkflowStatus = {
  PENDING: "pending",
  RUNNING: "running",
  WAITING_APPROVAL: "waiting_approval",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;
export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus];

export const StepStatus = {
  PENDING: "pending",
  RUNNING: "running",
  WAITING_APPROVAL: "waiting_approval",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export interface WorkflowStep extends BaseEntity {
  executionId: ID;
  key: string;
  name: string;
  order: number;
  status: StepStatus;
  requiresApproval: boolean;
  startedAt?: ISODateString;
  finishedAt?: ISODateString;
  durationMs?: number;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
}

export interface WorkflowExecution extends BaseEntity {
  definitionKey: string;
  title: string;
  status: WorkflowStatus;
  triggeredBy: "manual" | "agent" | "schedule";
  agentId?: ID;
  entityType?: string;
  entityId?: ID;
  steps: WorkflowStep[];
  currentStepKey?: string;
  progressPct: number;
  startedAt: ISODateString;
  finishedAt?: ISODateString;
}

export interface WorkflowDefinition {
  key: string;
  name: string;
  description: string;
  steps: Array<{
    key: string;
    name: string;
    requiresApproval: boolean;
  }>;
}

export interface ApprovalRequest extends BaseEntity {
  executionId: ID;
  workflowTitle: string;
  stepKey: string;
  stepName: string;
  summary: string;
  requestedByAgent?: string;
  riskLevel: "low" | "medium" | "high";
  payload: Record<string, unknown>;
}
