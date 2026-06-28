import type { BaseEntity, ID, ISODateString } from "./common";

/**
 * The three operational agents. They are deliberately thin in the type layer:
 * an agent is a named decision-maker bound to a domain. It owns no business
 * logic — it only chooses which workflow to trigger and when.
 */

export const AgentKey = {
  ARIA: "aria", // Service & customer lifecycle
  VAULT: "vault", // Inventory & procurement
  CIPHER: "cipher", // Finance & reconciliation
} as const;
export type AgentKey = (typeof AgentKey)[keyof typeof AgentKey];

export const AgentStatus = {
  ACTIVE: "active",
  IDLE: "idle",
  PAUSED: "paused",
  DEGRADED: "degraded",
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export interface Agent extends BaseEntity {
  key: AgentKey;
  name: string;
  domain: string;
  description: string;
  status: AgentStatus;
  /** Whether autonomous execution is enabled. When false the agent only suggests. */
  autonomous: boolean;
  confidence: number; // 0-1
  healthPct: number; // 0-100
  runningTasks: number;
  queuedDecisions: number;
  currentWorkflow?: string;
  lastDecision?: string;
  lastActionAt?: ISODateString;
  /** Rough resource footprint for the mission-control view. */
  cpuPct: number;
  memoryPct: number;
  actionsToday: number;
  successRatePct: number;
}

export interface AgentDecision extends BaseEntity {
  agentKey: AgentKey;
  agentName: string;
  summary: string;
  rationale: string;
  confidence: number;
  outcome: "executed" | "suggested" | "rejected" | "awaiting_approval";
  workflowKey?: string;
  executionId?: ID;
  entityLabel?: string;
}

export interface AgentAction extends BaseEntity {
  agentKey: AgentKey;
  description: string;
  status: "success" | "failed" | "pending";
  module: string;
}

export interface RetryQueueItem extends BaseEntity {
  agentKey: AgentKey;
  workflowTitle: string;
  stepName: string;
  error: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: ISODateString;
}
