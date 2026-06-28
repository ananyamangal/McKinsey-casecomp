"use client";

import {
  AlertTriangle,
  BadgeIndianRupee,
  CheckCircle2,
  FileText,
  Landmark,
  Plus,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { formatDate, formatMoney, humanize, money } from "@halo/utils";
import { Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from "@halo/ui";
import type { Invoice, Payment } from "@halo/types";
import { InvoiceStatus } from "@halo/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@halo/ui";
import { AreaTrend, ChartLegend, DonutChart } from "@/components/shared/charts";
import { useFinanceSummary, useInvoices, usePayments } from "@/lib/api/queries";
import { ErrorState } from "@/components/shared/states";
import { useListQuery } from "@/lib/use-list-query";

const compactMoney = (minor: number) => formatMoney(money(minor), { compact: true });

export default function FinancePage() {
  const summaryQuery = useFinanceSummary();
  const { data: summary, isLoading: summaryLoading } = summaryQuery;

  const invoiceLq = useListQuery({ pageSize: 10 });
  const { data: invoiceData, isLoading: invoicesLoading } = useInvoices(invoiceLq.query);

  const paymentLq = useListQuery({ pageSize: 10 });
  const { data: paymentData, isLoading: paymentsLoading } = usePayments(paymentLq.query);

  const collected = summary?.collectedMtd ?? 0;
  const outstanding = summary?.outstanding ?? 0;
  const splitData = [
    { label: "Collected", value: Math.round(collected / 100) },
    { label: "Outstanding", value: Math.round(outstanding / 100) },
  ];
  const gstHalf = (summary?.gstCollected ?? 0) / 2;

  const statusFilter = (invoiceLq.filters?.status as string | undefined) ?? "all";

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: "number",
      header: "Invoice #",
      sortable: true,
      cell: (i) => <span className="font-mono text-sm font-medium text-foreground">{i.number}</span>,
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      cell: (i) => <span className="font-medium">{i.customerName}</span>,
    },
    { key: "issuedAt", header: "Issued", sortable: true, cell: (i) => formatDate(i.issuedAt, "medium") },
    { key: "dueAt", header: "Due", sortable: true, cell: (i) => formatDate(i.dueAt, "medium") },
    {
      key: "subtotal.amountMinor",
      header: "Subtotal",
      sortable: true,
      align: "right",
      cell: (i) => <span className="tabular-nums">{formatMoney(i.subtotal)}</span>,
    },
    {
      key: "gstAmount.amountMinor",
      header: "GST",
      sortable: true,
      align: "right",
      cell: (i) => <span className="tabular-nums text-muted-foreground">{formatMoney(i.gstAmount)}</span>,
    },
    {
      key: "total.amountMinor",
      header: "Total",
      sortable: true,
      align: "right",
      cell: (i) => <span className="font-semibold tabular-nums">{formatMoney(i.total)}</span>,
    },
    { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
    {
      key: "erpSynced",
      header: "ERP",
      align: "center",
      cell: (i) =>
        i.erpSynced ? (
          <Badge variant="success">Synced</Badge>
        ) : (
          <Badge variant="muted">Pending</Badge>
        ),
    },
  ];

  const paymentColumns: Column<Payment>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      sortable: true,
      cell: (p) => <span className="font-mono text-sm font-medium text-foreground">{p.invoiceNumber}</span>,
    },
    {
      key: "method",
      header: "Method",
      cell: (p) => <Badge variant="secondary">{humanize(p.method)}</Badge>,
    },
    {
      key: "amount.amountMinor",
      header: "Amount",
      sortable: true,
      align: "right",
      cell: (p) => <span className="font-semibold tabular-nums">{formatMoney(p.amount)}</span>,
    },
    { key: "receivedAt", header: "Received", sortable: true, cell: (p) => formatDate(p.receivedAt, "medium") },
    {
      key: "reconciled",
      header: "Reconciled",
      align: "center",
      cell: (p) =>
        p.reconciled ? (
          <Badge variant="success">Reconciled</Badge>
        ) : (
          <Badge variant="warning">Pending</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Revenue, collections, GST and ERP reconciliation across the dealership."
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" /> Sync ERP
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </>
        }
      />

      {summaryQuery.isError && <ErrorState onRetry={() => summaryQuery.refetch()} />}

      {/* KPI row */}
      {summaryLoading || !summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[136px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Revenue (MTD)"
            value={compactMoney(summary.revenueMtd)}
            icon={BadgeIndianRupee}
            accent="blue"
            deltaPct={12.4}
            hint="vs last month"
          />
          <StatCard
            label="Collected (MTD)"
            value={compactMoney(summary.collectedMtd)}
            icon={Wallet}
            accent="emerald"
            deltaPct={8.1}
            hint="payments received"
          />
          <StatCard
            label="Outstanding"
            value={compactMoney(summary.outstanding)}
            icon={AlertTriangle}
            accent="amber"
            hint="awaiting collection"
          />
          <StatCard
            label="GST Collected"
            value={compactMoney(summary.gstCollected)}
            icon={Landmark}
            accent="violet"
            hint="this period"
          />
          <StatCard
            label="Needs Attention"
            value={`${summary.unreconciled + summary.erpPending}`}
            icon={ShieldCheck}
            accent="rose"
            hint={`${summary.unreconciled} unreconciled · ${summary.erpPending} ERP pending`}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Cash Flow"
          description="Net cash movement over the last 6 months (₹L)"
          className="lg:col-span-2"
        >
          {summaryLoading || !summary ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <AreaTrend data={summary.cashflowTrend} valueFormatter={(v) => `₹${v}L`} />
          )}
        </SectionCard>

        <SectionCard title="Collected vs Outstanding" description="Receivables split">
          {summaryLoading || !summary ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <div className="space-y-4">
              <DonutChart data={splitData} height={200} valueFormatter={(v) => formatMoney(money(v * 100), { compact: true })} />
              <ChartLegend data={splitData} />
            </div>
          )}
        </SectionCard>
      </div>

      {/* Reconciliation + GST */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Reconciliation"
          description="Sync payments and invoices with downstream systems"
          className="lg:col-span-2"
          action={
            <Button size="sm" variant="outline">
              <RefreshCw className="h-4 w-4" /> Run Reconciliation
            </Button>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-amber-50/60 p-4 dark:bg-amber-500/5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xl font-semibold text-foreground">{summary?.unreconciled ?? 0}</p>
                  <p className="text-xs text-muted-foreground">payments unreconciled</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-rose-50/60 p-4 dark:bg-rose-500/5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xl font-semibold text-foreground">{summary?.erpPending ?? 0}</p>
                  <p className="text-xs text-muted-foreground">invoices not ERP-synced</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integration status</p>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {[
                  { name: "SAP ERP", detail: "Last sync 4 min ago" },
                  { name: "DMS", detail: "Last sync 11 min ago" },
                ].map((sys) => (
                  <li key={sys.name} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-foreground">{sys.name}</span>
                      <Badge variant="success">Connected</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{sys.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="GST Summary" description="Tax collected this period">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Total GST Collected</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Receipt className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                {compactMoney(summary?.gstCollected ?? 0)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">CGST</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{formatMoney(money(gstHalf))}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">SGST</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{formatMoney(money(gstHalf))}</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Tabs: Invoices / Payments */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-0">
          <DataTable
            columns={invoiceColumns}
            data={invoiceData?.items ?? []}
            getRowId={(i) => i.id}
            total={invoiceData?.total}
            page={invoiceLq.page}
            pageSize={invoiceLq.pageSize}
            onPageChange={invoiceLq.setPage}
            sort={invoiceLq.sort}
            onSortChange={invoiceLq.setSort}
            search={invoiceLq.search}
            onSearchChange={invoiceLq.setSearch}
            searchPlaceholder="Search invoices…"
            loading={invoicesLoading}
            emptyTitle="No invoices"
            emptyDescription="Invoices will appear here once issued."
            toolbar={
              <Select
                value={statusFilter}
                onValueChange={(v) => invoiceLq.setFilter("status", v === "all" ? undefined : v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.values(InvoiceStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {humanize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-0">
          <DataTable
            columns={paymentColumns}
            data={paymentData?.items ?? []}
            getRowId={(p) => p.id}
            total={paymentData?.total}
            page={paymentLq.page}
            pageSize={paymentLq.pageSize}
            onPageChange={paymentLq.setPage}
            sort={paymentLq.sort}
            onSortChange={paymentLq.setSort}
            search={paymentLq.search}
            onSearchChange={paymentLq.setSearch}
            searchPlaceholder="Search payments…"
            loading={paymentsLoading}
            emptyTitle="No payments"
            emptyDescription="Recorded payments will appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
