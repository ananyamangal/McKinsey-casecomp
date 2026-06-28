"use client";

import * as React from "react";
import { CheckCircle2, Clock3, FileStack, Loader2, PackageCheck, Plus, Truck, XCircle } from "lucide-react";
import { formatDate, formatMoney, humanize, money } from "@halo/utils";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@halo/ui";
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from "@halo/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { usePurchaseOrders, useSuppliers } from "@/lib/api/queries";
import { useApprovePurchaseOrder, useRejectPurchaseOrder } from "@/lib/api/mutations";
import { ErrorState } from "@/components/shared/states";
import { useListQuery } from "@/lib/use-list-query";

const STATUS_FILTER_ALL = "__all__";

const PO_STATUS_OPTIONS: PurchaseOrderStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
];

/** Canonical lifecycle order used to derive a delivery timeline from a PO status. */
const PO_STAGE_ORDER: PurchaseOrderStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "ordered",
  "partially_received",
  "received",
];

/** Visible delivery timeline steps with the underlying status they map to. */
const TIMELINE_STAGES: { id: string; title: string; subtitle: string; stage: PurchaseOrderStatus }[] = [
  { id: "draft", title: "Draft", subtitle: "Purchase order created", stage: "draft" },
  { id: "approved", title: "Approved", subtitle: "Cleared for procurement", stage: "approved" },
  { id: "ordered", title: "Ordered", subtitle: "Sent to supplier", stage: "ordered" },
  { id: "in_transit", title: "In Transit", subtitle: "Partial shipment received", stage: "partially_received" },
  { id: "received", title: "Received", subtitle: "Goods checked into inventory", stage: "received" },
];

function lineTotalMinor(po: PurchaseOrder): number {
  return po.items.reduce((sum, it) => sum + it.unitCost.amountMinor * it.quantity, 0);
}

function deriveTimeline(status: PurchaseOrderStatus): TimelineItem[] {
  if (status === "cancelled") {
    return TIMELINE_STAGES.map((s, idx) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      status: idx === 0 ? "succeeded" : idx === 1 ? "failed" : "skipped",
    }));
  }
  const currentIdx = PO_STAGE_ORDER.indexOf(status);
  return TIMELINE_STAGES.map((s) => {
    const stageIdx = PO_STAGE_ORDER.indexOf(s.stage);
    let itemStatus: TimelineItem["status"];
    if (stageIdx < currentIdx) itemStatus = "succeeded";
    else if (stageIdx === currentIdx) itemStatus = status === "pending_approval" ? "waiting_approval" : "running";
    else itemStatus = "pending";
    // pending_approval sits before "approved" — keep draft completed, approved waiting.
    if (status === "pending_approval") {
      if (s.stage === "draft") itemStatus = "succeeded";
      else if (s.stage === "approved") itemStatus = "waiting_approval";
      else itemStatus = "pending";
    }
    return { id: s.id, title: s.title, subtitle: s.subtitle, status: itemStatus };
  });
}

export default function ProcurementPage() {
  const lq = useListQuery({ pageSize: 10 });
  const lq2 = useListQuery({ pageSize: 10 });

  const poQuery = usePurchaseOrders(lq.query);
  const { data: poData, isLoading: poLoading } = poQuery;
  const { data: supplierData, isLoading: supplierLoading } = useSuppliers(lq2.query);

  const approvePo = useApprovePurchaseOrder();
  const rejectPo = useRejectPurchaseOrder();

  const [selectedPo, setSelectedPo] = React.useState<PurchaseOrder | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const pos = poData?.items ?? [];

  const openPos = pos.filter((p) => p.status !== "received" && p.status !== "cancelled").length;
  const pendingApproval = pos.filter((p) => p.status === "pending_approval");
  const inTransit = pos.filter((p) => p.status === "ordered" || p.status === "partially_received").length;
  const spendThisMonthMinor = pos.reduce((sum, p) => sum + p.total.amountMinor, 0);

  const statusFilter =
    (typeof lq.filters?.status === "string" ? lq.filters.status : undefined) ?? STATUS_FILTER_ALL;

  const openDetail = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setDialogOpen(true);
  };

  const poColumns: Column<PurchaseOrder>[] = [
    {
      key: "number",
      header: "PO Number",
      sortable: true,
      cell: (p) => <span className="font-medium text-foreground">{p.number}</span>,
    },
    {
      key: "supplierName",
      header: "Supplier",
      sortable: true,
      cell: (p) => <span className="text-foreground">{p.supplierName}</span>,
    },
    {
      key: "items",
      header: "Items",
      align: "center",
      cell: (p) => (
        <Badge variant="muted" className="tabular-nums">
          {p.items.length}
        </Badge>
      ),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortable: true,
      cell: (p) => <span className="font-medium tabular-nums text-foreground">{formatMoney(p.total)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "expectedDelivery",
      header: "Expected Delivery",
      sortable: true,
      cell: (p) =>
        p.expectedDelivery ? (
          <span className="text-muted-foreground">{formatDate(p.expectedDelivery, "medium")}</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        ),
    },
    {
      key: "raisedByName",
      header: "Raised By",
      cell: (p) => <span className="text-muted-foreground">{p.raisedByName}</span>,
    },
  ];

  const supplierColumns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Supplier",
      sortable: true,
      cell: (s) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{s.name}</p>
          <p className="truncate text-xs text-muted-foreground">{s.contactName}</p>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      sortable: true,
      align: "right",
      cell: (s) => (
        <span className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground">
          {s.rating.toFixed(1)}
          <span className="text-amber-500">★</span>
        </span>
      ),
    },
    {
      key: "onTimeDeliveryPct",
      header: "On-Time Delivery",
      sortable: true,
      cell: (s) => (
        <div className="flex min-w-[140px] items-center gap-2">
          <Progress value={s.onTimeDeliveryPct} className="h-1.5 flex-1" />
          <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
            {Math.round(s.onTimeDeliveryPct)}%
          </span>
        </div>
      ),
    },
    {
      key: "avgLeadTimeDays",
      header: "Avg Lead Time",
      sortable: true,
      align: "right",
      cell: (s) => <span className="tabular-nums text-foreground">{s.avgLeadTimeDays}d</span>,
    },
    {
      key: "activeOrders",
      header: "Active Orders",
      sortable: true,
      align: "center",
      cell: (s) => (
        <Badge variant="muted" className="tabular-nums">
          {s.activeOrders}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => <StatusBadge status={s.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        description="Manage purchase orders, supplier performance and approvals across Apex Motors."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" /> New Purchase Order
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open POs"
          value={poLoading ? "—" : openPos}
          icon={FileStack}
          hint="Not yet received"
          accent="blue"
        />
        <StatCard
          label="Pending Approval"
          value={poLoading ? "—" : pendingApproval.length}
          icon={Clock3}
          hint="Awaiting sign-off"
          accent="amber"
        />
        <StatCard
          label="In Transit"
          value={poLoading ? "—" : inTransit}
          icon={Truck}
          hint="Ordered & partial"
          accent="violet"
        />
        <StatCard
          label="Spend This Month"
          value={poLoading ? "—" : formatMoney(money(spendThisMonthMinor), { compact: true })}
          icon={PackageCheck}
          hint="Across all POs"
          accent="emerald"
        />
      </div>

      <Tabs defaultValue="purchase-orders" className="space-y-5">
        <TabsList>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        {/* Purchase Orders */}
        <TabsContent value="purchase-orders" className="space-y-6">
          {poQuery.isError ? (
            <ErrorState onRetry={() => poQuery.refetch()} />
          ) : (
          <>
          <SectionCard
            title="Awaiting Approval"
            description="Purchase orders that need a manager sign-off before they can be ordered."
            action={
              <Badge variant="warning">
                {poLoading ? "—" : `${pendingApproval.length} pending`}
              </Badge>
            }
          >
            {poLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            ) : pendingApproval.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                All purchase orders are approved — nothing in the queue.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pendingApproval.map((po) => (
                  <div
                    key={po.id}
                    className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-500/30 dark:bg-amber-500/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          onClick={() => openDetail(po)}
                          className="truncate text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {po.number}
                        </button>
                        <p className="truncate text-xs text-muted-foreground">{po.supplierName}</p>
                      </div>
                      <StatusBadge status={po.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{po.items.length} items</span>
                      <span className="font-semibold tabular-nums text-foreground">{formatMoney(po.total)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-8 flex-1 text-xs"
                        disabled={approvePo.isPending || rejectPo.isPending}
                        onClick={() => approvePo.mutate(po.id)}
                      >
                        {approvePo.isPending && approvePo.variables === po.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}{" "}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 text-xs"
                        disabled={approvePo.isPending || rejectPo.isPending}
                        onClick={() => rejectPo.mutate(po.id)}
                      >
                        {rejectPo.isPending && rejectPo.variables === po.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}{" "}
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <DataTable
            columns={poColumns}
            data={pos}
            getRowId={(p) => p.id}
            total={poData?.total}
            page={lq.page}
            pageSize={lq.pageSize}
            onPageChange={lq.setPage}
            sort={lq.sort}
            onSortChange={lq.setSort}
            search={lq.search}
            onSearchChange={lq.setSearch}
            searchPlaceholder="Search purchase orders…"
            loading={poLoading}
            onRowClick={openDetail}
            emptyTitle="No purchase orders"
            emptyDescription="Create a purchase order to get started."
            toolbar={
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  lq.setFilter("status", value === STATUS_FILTER_ALL ? undefined : value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                  {PO_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {humanize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
          </>
          )}
        </TabsContent>

        {/* Suppliers */}
        <TabsContent value="suppliers">
          <DataTable
            columns={supplierColumns}
            data={supplierData?.items ?? []}
            getRowId={(s) => s.id}
            total={supplierData?.total}
            page={lq2.page}
            pageSize={lq2.pageSize}
            onPageChange={lq2.setPage}
            sort={lq2.sort}
            onSortChange={lq2.setSort}
            search={lq2.search}
            onSearchChange={lq2.setSearch}
            searchPlaceholder="Search suppliers…"
            loading={supplierLoading}
            emptyTitle="No suppliers"
            emptyDescription="Add a supplier to start raising purchase orders."
          />
        </TabsContent>
      </Tabs>

      {/* PO detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedPo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedPo.number}
                  <StatusBadge status={selectedPo.status} />
                </DialogTitle>
                <DialogDescription>
                  {selectedPo.supplierName} · Raised by {selectedPo.raisedByName}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier</span>
                    <span className="font-medium text-foreground">{selectedPo.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-foreground">{humanize(selectedPo.status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Delivery</span>
                    <span className="font-medium text-foreground">
                      {selectedPo.expectedDelivery ? formatDate(selectedPo.expectedDelivery, "medium") : "—"}
                    </span>
                  </div>
                  {selectedPo.approverName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approver</span>
                      <span className="font-medium text-foreground">{selectedPo.approverName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Total</span>
                    <span className="font-semibold text-foreground">{formatMoney(selectedPo.total)}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Order Timeline
                  </p>
                  <Timeline items={deriveTimeline(selectedPo.status)} />
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Line Items
                </p>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 font-semibold">SKU</th>
                        <th className="px-3 py-2 font-semibold">Name</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold">Unit Cost</th>
                        <th className="px-3 py-2 text-right font-semibold">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPo.items.map((it) => (
                        <tr key={it.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{it.sku}</td>
                          <td className="px-3 py-2 text-foreground">{it.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">{it.quantity}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                            {formatMoney(it.unitCost)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                            {formatMoney(money(it.unitCost.amountMinor * it.quantity))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground" colSpan={4}>
                          Total
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                          {formatMoney(money(lineTotalMinor(selectedPo)))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
