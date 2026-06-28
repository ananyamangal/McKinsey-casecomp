import type { TrendPoint } from "@halo/types";
import type { NotificationSeverity } from "@halo/types";

/**
 * Aggregation + notification shapes consumed by the dashboard/analytics/finance/
 * inventory pages and the notification panel. These are the EXACT field names the
 * backend serializes (copied verbatim from the former mock layer) — components
 * depend on these shapes, only the data source changed.
 */

export interface AppNotification {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  body: string;
  severity: (typeof NotificationSeverity)[keyof typeof NotificationSeverity];
  module: string;
  read: boolean;
}

export interface DashboardData {
  revenueToday: number;
  revenueDeltaPct: number;
  workshopUtilization: number;
  inventoryHealthPct: number;
  customerSatisfaction: number;
  appointmentsToday: number;
  financeAlerts: number;
  pendingOrders: number;
  revenueTrend: TrendPoint[];
  inventoryForecast: TrendPoint[];
  workshopTimeline: { bay: string; status: string; progress: number; eta?: number; vehicle?: string }[];
  serviceMix: TrendPoint[];
}

export interface AnalyticsData {
  kpis: { label: string; value: string; deltaPct: number }[];
  revenueByMonth: TrendPoint[];
  turnaroundTrend: TrendPoint[];
  technicianProductivity: { name: string; jobs: number; utilization: number }[];
  satisfactionTrend: TrendPoint[];
  forecastAccuracy: TrendPoint[];
}

export interface FinanceSummary {
  revenueMtd: number;
  outstanding: number;
  gstCollected: number;
  collectedMtd: number;
  unreconciled: number;
  erpPending: number;
  cashflowTrend: TrendPoint[];
}

export interface InventorySummary {
  totalValue: number;
  deadStockValue: number;
  fastMovingCount: number;
  inventoryDays: number;
  reorderCount: number;
  categoryConsumption: TrendPoint[];
}
