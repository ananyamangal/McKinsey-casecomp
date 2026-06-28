"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Agent, PurchaseOrder, WorkflowExecution } from "@halo/types";
import { apiFetch } from "@/lib/api/http";
import type { AppNotification } from "@/lib/api/types";

/**
 * React Query mutations with optimistic updates: each mutation cancels in-flight
 * queries, snapshots the affected caches, applies the expected result immediately,
 * rolls back on error, and revalidates on settle.
 */

// --- Workflows ---------------------------------------------------------------

/** Optimistically patch every cached WorkflowExecution matching `id`. */
function patchWorkflows(
  qc: QueryClient,
  id: string,
  patch: Partial<WorkflowExecution>,
): WorkflowExecution[][] {
  const snapshots: WorkflowExecution[][] = [];
  qc.setQueriesData<WorkflowExecution[]>({ queryKey: ["workflows"] }, (old) => {
    if (!old) return old;
    snapshots.push(old);
    return old.map((w) => (w.id === id ? { ...w, ...patch } : w));
  });
  return snapshots;
}

export function useApproveWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<WorkflowExecution>(`/workflows/${id}/approve`, { method: "POST" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["workflows"] });
      const snapshots = patchWorkflows(qc, id, { status: "running" });
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach((snap) => qc.setQueryData(["workflows"], snap));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

export function useRetryWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<WorkflowExecution>(`/workflows/${id}/retry`, { method: "POST" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["workflows"] });
      const snapshots = patchWorkflows(qc, id, { status: "running" });
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach((snap) => qc.setQueryData(["workflows"], snap));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["retry-queue"] });
    },
  });
}

// --- Purchase orders ---------------------------------------------------------

/** Optimistically patch every cached PurchaseOrder list matching `id`. */
function patchPurchaseOrders(qc: QueryClient, id: string, status: PurchaseOrder["status"]) {
  const previous = qc.getQueriesData<{ items: PurchaseOrder[] }>({ queryKey: ["purchase-orders"] });
  qc.setQueriesData<{ items: PurchaseOrder[] }>({ queryKey: ["purchase-orders"] }, (old) => {
    if (!old) return old;
    return { ...old, items: old.items.map((p) => (p.id === id ? { ...p, status } : p)) };
  });
  return previous;
}

export function useApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<PurchaseOrder>(`/purchase-orders/${id}/approve`, { method: "POST" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["purchase-orders"] });
      const previous = patchPurchaseOrders(qc, id, "approved");
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useRejectPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<PurchaseOrder>(`/purchase-orders/${id}/reject`, { method: "POST" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["purchase-orders"] });
      const previous = patchPurchaseOrders(qc, id, "cancelled");
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

// --- Notifications -----------------------------------------------------------

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<AppNotification>(`/notifications/${id}/read`, { method: "POST" }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const previous = qc.getQueryData<AppNotification[]>(["notifications"]);
      qc.setQueryData<AppNotification[]>(["notifications"], (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notifications"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ updated: number }>(`/notifications/read-all`, { method: "POST" }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const previous = qc.getQueryData<AppNotification[]>(["notifications"]);
      qc.setQueryData<AppNotification[]>(["notifications"], (old) =>
        old?.map((n) => ({ ...n, read: true })),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notifications"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// --- Agents ------------------------------------------------------------------

export function useToggleAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, autonomous }: { key: string; autonomous: boolean }) =>
      apiFetch<Agent>(`/agents/${key}/toggle`, { method: "POST", body: { autonomous } }),
    onMutate: async ({ key, autonomous }) => {
      await qc.cancelQueries({ queryKey: ["agents"] });
      const previous = qc.getQueryData<Agent[]>(["agents"]);
      qc.setQueryData<Agent[]>(["agents"], (old) =>
        old?.map((a) => (a.key === key ? { ...a, autonomous } : a)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["agents"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}
