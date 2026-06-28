"use client";

import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  PackagePlus,
  Plus,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn, formatMoney, formatNumber, money } from "@halo/utils";
import {
  Badge,
  Button,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@halo/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { BarSeries, DonutChart, ChartLegend } from "@/components/shared/charts";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { useInventory, useInventorySummary } from "@/lib/api/queries";
import { useListQuery } from "@/lib/use-list-query";
import { ABCClass, StockHealth } from "@halo/types";
import type { InventoryItem } from "@halo/types";

const ALL = "__all__";

const CATEGORIES = [
  "Brakes",
  "Filters",
  "Fluids",
  "Electrical",
  "Suspension",
  "Engine",
  "Transmission",
  "Tyres",
  "Body",
  "Cooling",
] as const;

const HEALTH_OPTIONS: { value: StockHealth; label: string }[] = [
  { value: StockHealth.HEALTHY, label: "Healthy" },
  { value: StockHealth.LOW, label: "Low" },
  { value: StockHealth.CRITICAL, label: "Critical" },
  { value: StockHealth.OVERSTOCK, label: "Overstock" },
  { value: StockHealth.DEAD, label: "Dead" },
];

const HEALTH_BAR: Record<StockHealth, string> = {
  [StockHealth.HEALTHY]: "bg-emerald-500",
  [StockHealth.LOW]: "bg-amber-500",
  [StockHealth.CRITICAL]: "bg-rose-500",
  [StockHealth.OVERSTOCK]: "bg-blue-500",
  [StockHealth.DEAD]: "bg-slate-400",
};

const ABC_VARIANT: Record<ABCClass, "info" | "muted" | "outline"> = {
  [ABCClass.A]: "info",
  [ABCClass.B]: "muted",
  [ABCClass.C]: "outline",
};

function selectValue(raw: string | string[] | undefined): string {
  return typeof raw === "string" ? raw : ALL;
}

export default function InventoryPage() {
  const lq = useListQuery({ pageSize: 10 });

  const summaryQuery = useInventorySummary();
  const { data: summary, isLoading: summaryLoading } = summaryQuery;
  // Large page used purely to derive the stock-health distribution and reorder list.
  const { data: pool, isLoading: poolLoading } = useInventory({ page: 1, pageSize: 60 });
  const { data: table, isLoading: tableLoading } = useInventory(lq.query);

  const poolItems = pool?.items ?? [];

  // Stock health distribution from the loaded pool.
  const healthDistribution = (() => {
    const counts: Record<StockHealth, number> = {
      [StockHealth.HEALTHY]: 0,
      [StockHealth.LOW]: 0,
      [StockHealth.CRITICAL]: 0,
      [StockHealth.OVERSTOCK]: 0,
      [StockHealth.DEAD]: 0,
    };
    for (const item of poolItems) counts[item.health] += 1;
    return HEALTH_OPTIONS.map((o) => ({ label: o.label, value: counts[o.value] })).filter(
      (d) => d.value > 0,
    );
  })();

  const reorderItems = poolItems
    .filter((i) => i.currentStock < i.reorderPoint)
    .sort((a, b) => a.currentStock - b.currentStock)
    .slice(0, 5);

  const categoryFilter = selectValue(lq.filters?.["category"]);
  const healthFilter = selectValue(lq.filters?.["health"]);

  const columns: Column<InventoryItem>[] = [
    {
      key: "name",
      header: "Part",
      sortable: true,
      cell: (i) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{i.name}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{i.sku}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (i) => <Badge variant="outline">{i.category}</Badge>,
    },
    {
      key: "currentStock",
      header: "Stock",
      sortable: true,
      align: "right",
      cell: (i) => {
        const target = Math.max(i.reorderPoint, i.currentStock, 1);
        const pct = Math.min(100, Math.round((i.currentStock / target) * 100));
        return (
          <div className="ml-auto flex w-28 flex-col items-end gap-1">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {formatNumber(i.currentStock)}
            </span>
            <Progress value={pct} indicatorClassName={HEALTH_BAR[i.health]} className="h-1.5 w-full" />
          </div>
        );
      },
    },
    {
      key: "reorderPoint",
      header: "Safety / Reorder",
      align: "right",
      cell: (i) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          {i.safetyStock} / {i.reorderPoint}
        </span>
      ),
    },
    {
      key: "predictedDemand30d",
      header: "Predicted Demand",
      sortable: true,
      align: "right",
      cell: (i) => (
        <span className="tabular-nums text-foreground">{formatNumber(i.predictedDemand30d)}</span>
      ),
    },
    {
      key: "leadTimeDays",
      header: "Lead Time",
      sortable: true,
      align: "right",
      cell: (i) => <span className="tabular-nums text-muted-foreground">{i.leadTimeDays}d</span>,
    },
    {
      key: "abcClass",
      header: "ABC",
      align: "center",
      cell: (i) => <Badge variant={ABC_VARIANT[i.abcClass]}>{i.abcClass}</Badge>,
    },
    {
      key: "health",
      header: "Health",
      cell: (i) => <StatusBadge status={i.health} />,
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      sortable: true,
      align: "right",
      cell: (i) => (
        <span className="font-medium tabular-nums text-foreground">{formatMoney(i.unitCost)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Parts warehouse health, demand forecasts and reorder intelligence across the network."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4" /> Reorder Suggestions
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Add Part
            </Button>
          </>
        }
      />

      {summaryQuery.isError && <ErrorState onRetry={() => summaryQuery.refetch()} />}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          label="Inventory Value"
          value={
            summaryLoading || !summary
              ? "—"
              : formatMoney(money(summary.totalValue), { compact: true })
          }
          icon={Boxes}
          hint="Stock at cost"
          accent="blue"
          spark={[62, 64, 61, 66, 68, 67, 70, 72]}
        />
        <StatCard
          label="Dead / Overstock Value"
          value={
            summaryLoading || !summary
              ? "—"
              : formatMoney(money(summary.deadStockValue), { compact: true })
          }
          icon={PackagePlus}
          hint="Capital tied up"
          accent="amber"
        />
        <StatCard
          label="Fast-Moving Parts"
          value={summaryLoading || !summary ? "—" : formatNumber(summary.fastMovingCount)}
          icon={TrendingUp}
          hint="ABC class A SKUs"
          accent="emerald"
        />
        <StatCard
          label="Inventory Days"
          value={summaryLoading || !summary ? "—" : `${summary.inventoryDays}d`}
          icon={CalendarClock}
          hint="Days of cover"
          accent="violet"
        />
        <StatCard
          label="Reorder Needed"
          value={summaryLoading || !summary ? "—" : formatNumber(summary.reorderCount)}
          icon={AlertTriangle}
          hint="Below reorder point"
          accent="rose"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Consumption by Category"
          description="Predicted 30-day demand (units)"
          className="lg:col-span-2"
        >
          {summary ? (
            <BarSeries data={summary.categoryConsumption} />
          ) : (
            <Skeleton className="h-[240px] w-full" />
          )}
        </SectionCard>

        <SectionCard title="Stock Health" description="Distribution across warehouse">
          {poolLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : healthDistribution.length > 0 ? (
            <div className="space-y-4">
              <DonutChart data={healthDistribution} height={180} />
              <ChartLegend data={healthDistribution} />
            </div>
          ) : (
            <EmptyState title="No stock data" description="No inventory items to summarise." />
          )}
        </SectionCard>
      </div>

      {/* Reorder suggestions */}
      <SectionCard
        title="Reorder Suggestions"
        description="Parts below reorder point, ranked by urgency"
        action={<Badge variant="warning">{reorderItems.length} flagged</Badge>}
      >
        {poolLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : reorderItems.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="All stocked up"
            description="No parts are currently below their reorder point."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {reorderItems.map((item) => {
              const target = Math.max(item.reorderPoint, 1);
              const pct = Math.min(100, Math.round((item.currentStock / target) * 100));
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <StatusBadge status={item.health} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Stock vs reorder</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {item.currentStock} / {item.reorderPoint}
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      indicatorClassName={HEALTH_BAR[item.health]}
                      className="h-1.5"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{item.supplierName}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatNumber(item.predictedDemand30d)}/30d
                    </span>
                  </div>

                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <ShoppingCart className="h-3.5 w-3.5" /> Create PO
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Main table */}
      <DataTable
        columns={columns}
        data={table?.items ?? []}
        getRowId={(i) => i.id}
        total={table?.total}
        page={lq.page}
        pageSize={lq.pageSize}
        onPageChange={lq.setPage}
        sort={lq.sort}
        onSortChange={lq.setSort}
        search={lq.search}
        onSearchChange={lq.setSearch}
        searchPlaceholder="Search SKU, part, supplier…"
        loading={tableLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Select
              value={categoryFilter}
              onValueChange={(v) => lq.setFilter("category", v === ALL ? undefined : v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={healthFilter}
              onValueChange={(v) => lq.setFilter("health", v === ALL ? undefined : v)}
            >
              <SelectTrigger className={cn("w-[150px]")}>
                <SelectValue placeholder="All health" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All health</SelectItem>
                {HEALTH_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  );
}
