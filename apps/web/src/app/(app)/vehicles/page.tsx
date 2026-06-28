"use client";

import { useRouter } from "next/navigation";
import {
  Car,
  HeartPulse,
  Plus,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { formatNumber } from "@halo/utils";
import {
  Badge,
  Button,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@halo/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useVehicles } from "@/lib/api/queries";
import { ErrorState } from "@/components/shared/states";
import { useListQuery } from "@/lib/use-list-query";
import type { Vehicle } from "@halo/types";

const MAKES = ["BMW", "Mercedes-Benz", "Tata", "Mahindra", "Hyundai"] as const;
const ALL_MAKES = "__all__";

function healthIndicatorClass(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export default function VehiclesPage() {
  const router = useRouter();
  const lq = useListQuery({ pageSize: 10 });
  const vehiclesQuery = useVehicles(lq.query);
  const { data, isLoading } = vehiclesQuery;

  const items = data?.items ?? [];

  const avgHealth =
    items.length > 0
      ? Math.round(items.reduce((sum, v) => sum + v.healthScore, 0) / items.length)
      : 0;
  const underWarranty = items.filter((v) => Boolean(v.warrantyValidUntil)).length;
  const dueForService = items.filter(
    (v) => v.nextServiceDueKm !== undefined && v.mileageKm >= v.nextServiceDueKm,
  ).length;

  const makeFilterRaw = lq.filters?.["make"];
  const makeFilter = typeof makeFilterRaw === "string" ? makeFilterRaw : ALL_MAKES;

  const columns: Column<Vehicle>[] = [
    {
      key: "make",
      header: "Vehicle",
      cell: (v) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {v.make} {v.model}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {v.variant} · {v.year}
          </p>
        </div>
      ),
    },
    {
      key: "registration",
      header: "Registration",
      cell: (v) => (
        <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-xs font-medium tracking-wide text-foreground">
          {v.registration}
        </span>
      ),
    },
    {
      key: "ownerName",
      header: "Owner",
      cell: (v) => <span className="text-foreground">{v.ownerName}</span>,
    },
    {
      key: "mileageKm",
      header: "Mileage",
      sortable: true,
      align: "right",
      cell: (v) => (
        <span className="tabular-nums text-foreground">{formatNumber(v.mileageKm)} km</span>
      ),
    },
    {
      key: "healthScore",
      header: "Health",
      sortable: true,
      cell: (v) => (
        <div className="flex items-center gap-2">
          <Progress
            value={v.healthScore}
            indicatorClassName={healthIndicatorClass(v.healthScore)}
            className="h-1.5 w-20"
          />
          <span className="w-9 text-right text-xs font-medium tabular-nums text-muted-foreground">
            {Math.round(v.healthScore)}%
          </span>
        </div>
      ),
    },
    {
      key: "warranty",
      header: "Warranty",
      cell: (v) =>
        v.warrantyValidUntil ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="muted">Expired</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Connected vehicle registry across the dealership network — health, warranty and service status at a glance."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" /> Register Vehicle
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Vehicles"
          value={isLoading ? "—" : formatNumber(data?.total ?? 0)}
          icon={Car}
          hint="In active registry"
          accent="blue"
        />
        <StatCard
          label="Avg Health Score"
          value={isLoading ? "—" : `${avgHealth}%`}
          icon={HeartPulse}
          hint="Across visible fleet"
          accent="emerald"
        />
        <StatCard
          label="Under Warranty"
          value={isLoading ? "—" : formatNumber(underWarranty)}
          icon={ShieldCheck}
          hint="Active coverage"
          accent="violet"
        />
        <StatCard
          label="Due for Service"
          value={isLoading ? "—" : formatNumber(dueForService)}
          icon={Wrench}
          hint="At or past next interval"
          accent="amber"
        />
      </div>

      {vehiclesQuery.isError ? (
        <ErrorState onRetry={() => vehiclesQuery.refetch()} />
      ) : (
      <DataTable
        columns={columns}
        data={items}
        getRowId={(v) => v.id}
        total={data?.total}
        page={lq.page}
        pageSize={lq.pageSize}
        onPageChange={lq.setPage}
        sort={lq.sort}
        onSortChange={lq.setSort}
        search={lq.search}
        onSearchChange={lq.setSearch}
        searchPlaceholder="Search by VIN, chassis, registration…"
        loading={isLoading}
        onRowClick={(v) => router.push(`/vehicles/${v.id}`)}
        toolbar={
          <Select
            value={makeFilter}
            onValueChange={(v) =>
              lq.setFilter("make", v === ALL_MAKES ? undefined : v)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All makes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MAKES}>All makes</SelectItem>
              {MAKES.map((make) => (
                <SelectItem key={make} value={make}>
                  {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      )}
    </div>
  );
}
