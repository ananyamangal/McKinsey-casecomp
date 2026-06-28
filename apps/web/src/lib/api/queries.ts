"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  ActivityEvent,
  Agent,
  AgentAction,
  AgentDecision,
  Appointment,
  ApprovalRequest,
  Customer,
  InventoryItem,
  Invoice,
  ListQuery,
  PaginatedResult,
  Payment,
  PredictedMaintenance,
  PurchaseOrder,
  RetryQueueItem,
  ServiceBay,
  Supplier,
  Technician,
  TelematicsEvent,
  Vehicle,
  WorkOrder,
  WorkflowExecution,
} from "@halo/types";
import { apiFetch } from "@/lib/api/http";
import type {
  AnalyticsData,
  AppNotification,
  DashboardData,
  FinanceSummary,
  InventorySummary,
} from "@/lib/api/types";

/**
 * Typed React Query hooks. Components depend only on these — never on the HTTP
 * client directly — so the data source stays encapsulated behind stable names.
 */

const DEFAULT_LIST: ListQuery = { page: 1, pageSize: 10 };

/** Translate a ListQuery into the contract's flat query-param object. */
function listParams(query: ListQuery): Record<string, string | number | undefined> {
  const { page, pageSize, search, sort, filters } = query;
  const params: Record<string, string | number | undefined> = {
    page,
    pageSize,
    search: search?.trim() || undefined,
    sortField: sort?.field,
    sortDir: sort?.direction,
  };
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined) continue;
      params[key] = Array.isArray(value) ? value.join(",") : value;
    }
  }
  return params;
}

function getList<T>(path: string, query: ListQuery) {
  return apiFetch<PaginatedResult<T>>(path, { params: listParams(query) });
}

// --- Customers ---------------------------------------------------------------
export function useCustomers(query: ListQuery = DEFAULT_LIST) {
  return useQuery({
    queryKey: ["customers", query],
    queryFn: () => getList<Customer>("/customers", query),
    placeholderData: keepPreviousData,
  });
}
export const useCustomer = (id: string) =>
  useQuery({
    queryKey: ["customer", id],
    queryFn: () => apiFetch<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
export const useCustomerVehicles = (id: string) =>
  useQuery({
    queryKey: ["customer-vehicles", id],
    queryFn: () => apiFetch<Vehicle[]>(`/customers/${id}/vehicles`),
    enabled: !!id,
  });

// --- Vehicles ----------------------------------------------------------------
export function useVehicles(query: ListQuery = DEFAULT_LIST) {
  return useQuery({
    queryKey: ["vehicles", query],
    queryFn: () => getList<Vehicle>("/vehicles", query),
    placeholderData: keepPreviousData,
  });
}
export const useVehicle = (id: string) =>
  useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => apiFetch<Vehicle>(`/vehicles/${id}`),
    enabled: !!id,
  });
export const useVehicleTelematics = (id: string) =>
  useQuery({
    queryKey: ["vehicle-telematics", id],
    queryFn: () => apiFetch<TelematicsEvent[]>(`/vehicles/${id}/telematics`),
    enabled: !!id,
  });
export const useVehiclePredictions = (id: string) =>
  useQuery({
    queryKey: ["vehicle-predictions", id],
    queryFn: () => apiFetch<PredictedMaintenance[]>(`/vehicles/${id}/predictions`),
    enabled: !!id,
  });

// --- Workshop ----------------------------------------------------------------
export const useBays = () =>
  useQuery({ queryKey: ["bays"], queryFn: () => apiFetch<ServiceBay[]>("/bays") });
export const useTechnicians = () =>
  useQuery({ queryKey: ["technicians"], queryFn: () => apiFetch<Technician[]>("/technicians") });

export function useWorkOrders(query: ListQuery = DEFAULT_LIST) {
  return useQuery({
    queryKey: ["work-orders", query],
    queryFn: () => getList<WorkOrder>("/work-orders", query),
    placeholderData: keepPreviousData,
  });
}
export function useAppointments(query: ListQuery = DEFAULT_LIST) {
  return useQuery({
    queryKey: ["appointments", query],
    queryFn: () => getList<Appointment>("/appointments", query),
    placeholderData: keepPreviousData,
  });
}

// --- Inventory ---------------------------------------------------------------
export function useInventory(query: ListQuery = DEFAULT_LIST) {
  return useQuery({
    queryKey: ["inventory", query],
    queryFn: () => getList<InventoryItem>("/inventory", query),
    placeholderData: keepPreviousData,
  });
}
export const useInventorySummary = () =>
  useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => apiFetch<InventorySummary>("/inventory/summary"),
  });

// --- Procurement -------------------------------------------------------------
export function useSuppliers(query: ListQuery = DEFAULT_LIST) {
  return useQuery({
    queryKey: ["suppliers", query],
    queryFn: () => getList<Supplier>("/suppliers", query),
    placeholderData: keepPreviousData,
  });
}
export function usePurchaseOrders(query: ListQuery = DEFAULT_LIST) {
  return useQuery({
    queryKey: ["purchase-orders", query],
    queryFn: () => getList<PurchaseOrder>("/purchase-orders", query),
    placeholderData: keepPreviousData,
  });
}

// --- Finance -----------------------------------------------------------------
export function useInvoices(query: ListQuery = DEFAULT_LIST) {
  return useQuery({
    queryKey: ["invoices", query],
    queryFn: () => getList<Invoice>("/invoices", query),
    placeholderData: keepPreviousData,
  });
}
export function usePayments(query: ListQuery = DEFAULT_LIST) {
  return useQuery({
    queryKey: ["payments", query],
    queryFn: () => getList<Payment>("/payments", query),
    placeholderData: keepPreviousData,
  });
}
export const useFinanceSummary = () =>
  useQuery({ queryKey: ["finance-summary"], queryFn: () => apiFetch<FinanceSummary>("/finance/summary") });

// --- AI center ---------------------------------------------------------------
export const useAgents = () =>
  useQuery({ queryKey: ["agents"], queryFn: () => apiFetch<Agent[]>("/agents") });
export const useDecisions = () =>
  useQuery({ queryKey: ["decisions"], queryFn: () => apiFetch<AgentDecision[]>("/agents/decisions") });
export const useAgentActions = () =>
  useQuery({ queryKey: ["agent-actions"], queryFn: () => apiFetch<AgentAction[]>("/agents/actions") });
export const useWorkflows = () =>
  useQuery({ queryKey: ["workflows"], queryFn: () => apiFetch<WorkflowExecution[]>("/workflows") });
export const useApprovals = () =>
  useQuery({ queryKey: ["approvals"], queryFn: () => apiFetch<ApprovalRequest[]>("/approvals") });
export const useRetryQueue = () =>
  useQuery({ queryKey: ["retry-queue"], queryFn: () => apiFetch<RetryQueueItem[]>("/retry-queue") });

// --- Shell -------------------------------------------------------------------
export const useActivity = () =>
  useQuery({ queryKey: ["activity"], queryFn: () => apiFetch<ActivityEvent[]>("/activity") });
export const useNotifications = () =>
  useQuery({ queryKey: ["notifications"], queryFn: () => apiFetch<AppNotification[]>("/notifications") });
export const useDashboard = () =>
  useQuery({ queryKey: ["dashboard"], queryFn: () => apiFetch<DashboardData>("/dashboard") });
export const useAnalytics = () =>
  useQuery({ queryKey: ["analytics"], queryFn: () => apiFetch<AnalyticsData>("/analytics") });
