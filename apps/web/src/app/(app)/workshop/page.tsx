"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Gauge,
  Plus,
  Timer,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { cn, formatMoney, initials } from "@halo/utils";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  Progress,
  Skeleton,
} from "@halo/ui";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { useBays, useTechnicians, useWorkOrders } from "@/lib/api/queries";
import { useListQuery } from "@/lib/use-list-query";
import type { ServiceBay, Technician, WorkOrder } from "@halo/types";

function formatEta(minutes?: number): string {
  if (minutes === undefined || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function WorkshopPage() {
  const baysQuery = useBays();
  const { data: baysData, isLoading: baysLoading } = baysQuery;
  const { data: techs = [], isLoading: techsLoading } = useTechnicians();
  const lq = useListQuery({ pageSize: 8 });
  const { data: woData, isLoading: woLoading } = useWorkOrders(lq.query);

  // Local, drag-reschedulable copy of the bays.
  const [bays, setBays] = React.useState<ServiceBay[]>([]);
  const [dragFrom, setDragFrom] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (baysData) setBays(baysData);
  }, [baysData]);

  const occupied = bays.filter((b) => b.status === "occupied");
  const totalBays = bays.length;
  const techsOnShift = techs.length;
  const jobsCompleted = techs.reduce((acc, t) => acc + t.jobsCompletedToday, 0);
  const avgEta =
    occupied.length > 0
      ? Math.round(
          occupied.reduce((acc, b) => acc + (b.etaMinutes ?? 0), 0) / occupied.length,
        )
      : 0;

  // Move the "job" (occupancy payload) of one bay into another, swapping where sensible.
  const moveJob = React.useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      setBays((prev) => {
        const fromBay = prev.find((b) => b.id === fromId);
        const toBay = prev.find((b) => b.id === toId);
        if (!fromBay || !toBay) return prev;
        if (fromBay.status !== "occupied") return prev;
        if (toBay.status === "maintenance") return prev;

        return prev.map((b) => {
          const jobFields = {
            status: fromBay.status,
            technicianId: fromBay.technicianId,
            technicianName: fromBay.technicianName,
            vehicleId: fromBay.vehicleId,
            vehicleLabel: fromBay.vehicleLabel,
            workOrderId: fromBay.workOrderId,
            jobStatus: fromBay.jobStatus,
            progressPct: fromBay.progressPct,
            etaMinutes: fromBay.etaMinutes,
            partsReady: fromBay.partsReady,
          };
          const cleared = {
            status: "idle" as ServiceBay["status"],
            technicianId: undefined,
            technicianName: undefined,
            vehicleId: undefined,
            vehicleLabel: undefined,
            workOrderId: undefined,
            jobStatus: undefined,
            progressPct: undefined,
            etaMinutes: undefined,
            partsReady: undefined,
          };
          if (b.id === toId) return { ...b, ...jobFields };
          if (b.id === fromId) {
            // If target was occupied, swap its job back; else leave from-bay idle.
            if (toBay.status === "occupied") {
              return {
                ...b,
                status: toBay.status,
                technicianId: toBay.technicianId,
                technicianName: toBay.technicianName,
                vehicleId: toBay.vehicleId,
                vehicleLabel: toBay.vehicleLabel,
                workOrderId: toBay.workOrderId,
                jobStatus: toBay.jobStatus,
                progressPct: toBay.progressPct,
                etaMinutes: toBay.etaMinutes,
                partsReady: toBay.partsReady,
              };
            }
            return { ...b, ...cleared };
          }
          return b;
        });
      });
    },
    [],
  );

  const columns: Column<WorkOrder>[] = [
    {
      key: "number",
      header: "Number",
      sortable: true,
      cell: (w) => <span className="font-medium text-foreground">{w.number}</span>,
    },
    {
      key: "vehicleLabel",
      header: "Vehicle",
      cell: (w) => <span className="text-muted-foreground">{w.vehicleLabel}</span>,
    },
    {
      key: "technicianName",
      header: "Technician",
      cell: (w) => w.technicianName ?? <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (w) => <StatusBadge status={w.status} />,
    },
    {
      key: "progressPct",
      header: "Progress",
      cell: (w) => (
        <div className="flex items-center gap-2">
          <Progress value={w.progressPct} className="h-1.5 w-24" />
          <span className="w-9 text-xs tabular-nums text-muted-foreground">{w.progressPct}%</span>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      align: "right",
      cell: (w) => <span className="font-medium tabular-nums">{formatMoney(w.total)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workshop"
        description="Live service-bay operations — mission control for technicians, jobs and turnaround."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" /> New Job Card
          </Button>
        }
      />

      {baysQuery.isError && <ErrorState onRetry={() => baysQuery.refetch()} />}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bays Active"
          value={baysLoading ? "—" : `${occupied.length}/${totalBays}`}
          icon={Wrench}
          hint="occupied / total bays"
          accent="blue"
          spark={[4, 5, 5, 6, 5, 6, 6, 7]}
        />
        <StatCard
          label="Avg Turnaround"
          value={baysLoading ? "—" : formatEta(avgEta)}
          icon={Timer}
          hint="estimated time remaining"
          accent="violet"
        />
        <StatCard
          label="Technicians On Shift"
          value={techsLoading ? "—" : techsOnShift}
          icon={Users}
          hint={`${techs.filter((t) => t.available).length} available now`}
          accent="emerald"
        />
        <StatCard
          label="Jobs Completed Today"
          value={techsLoading ? "—" : jobsCompleted}
          icon={Gauge}
          hint="across all technicians"
          accent="amber"
          spark={[6, 9, 11, 14, 16, 19, 22, 24]}
        />
      </div>

      {/* Service bay board */}
      <SectionCard
        title="Service Bay Board"
        description="Drag jobs between bays to reschedule"
        action={
          <Badge variant="info">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            Live
          </Badge>
        }
      >
        {baysLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : bays.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No service bays"
            description="No bays are configured for this workshop yet."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bays.map((bay) => {
              const isOccupied = bay.status === "occupied";
              const isMaintenance = bay.status === "maintenance";
              const isTarget = dropTarget === bay.id;
              const isSource = dragFrom === bay.id;

              return (
                <motion.div
                  key={bay.id}
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  draggable={isOccupied}
                  onDragStart={() => isOccupied && setDragFrom(bay.id)}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setDropTarget(null);
                  }}
                  onDragOver={(e) => {
                    if (dragFrom && dragFrom !== bay.id && !isMaintenance) {
                      e.preventDefault();
                      setDropTarget(bay.id);
                    }
                  }}
                  onDragLeave={() => setDropTarget((t) => (t === bay.id ? null : t))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom) moveJob(dragFrom, bay.id);
                    setDragFrom(null);
                    setDropTarget(null);
                  }}
                >
                  <Card
                    className={cn(
                      "relative flex h-full flex-col gap-3 p-4 shadow-card transition-all",
                      isOccupied && "cursor-grab active:cursor-grabbing",
                      isMaintenance && "border-amber-200 bg-amber-50/60 dark:bg-amber-500/5",
                      !isOccupied && !isMaintenance && "border-dashed bg-muted/30",
                      isTarget && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      isSource && "opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{bay.name}</span>
                      <StatusBadge status={bay.status} pulse={isOccupied} />
                    </div>

                    {isOccupied ? (
                      <>
                        <div>
                          <p className="truncate text-sm font-medium text-foreground">
                            {bay.vehicleLabel ?? "Vehicle"}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                {initials(bay.technicianName ?? "?")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-xs text-muted-foreground">
                              {bay.technicianName ?? "Unassigned"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            {bay.jobStatus ? (
                              <StatusBadge status={bay.jobStatus} className="text-[10px]" />
                            ) : (
                              <span className="text-[10px] text-muted-foreground">In service</span>
                            )}
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {bay.progressPct ?? 0}%
                            </span>
                          </div>
                          <Progress value={bay.progressPct ?? 0} className="h-1.5" />
                        </div>

                        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            ETA {formatEta(bay.etaMinutes)}
                          </span>
                          {bay.partsReady ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Parts ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                              <Clock className="h-3.5 w-3.5" /> Awaiting parts
                            </span>
                          )}
                        </div>
                      </>
                    ) : isMaintenance ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10">
                          <UserCog className="h-5 w-5" />
                        </span>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          Under maintenance
                        </p>
                        <p className="text-xs text-muted-foreground">Temporarily out of service</p>
                      </div>
                    ) : (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Wrench className="h-5 w-5" />
                        </span>
                        <p className="text-sm font-medium text-muted-foreground">Available</p>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Plus className="h-3.5 w-3.5" /> Assign job
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Drag jobs between bays to reschedule. Maintenance bays cannot accept jobs.
        </p>
      </SectionCard>

      {/* Lower columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Technician Status" description="Live utilization and throughput">
          {techsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : techs.length === 0 ? (
            <EmptyState icon={Users} title="No technicians" description="No technicians on shift." />
          ) : (
            <div className="space-y-4">
              {techs.map((tech: Technician) => (
                <div key={tech.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(tech.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{tech.name}</p>
                      {tech.available ? (
                        <Badge variant="success">Available</Badge>
                      ) : (
                        <Badge variant="muted">Busy</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{tech.specialty}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress value={tech.utilizationPct} className="h-1.5 flex-1" />
                      <span className="w-9 text-xs tabular-nums text-muted-foreground">
                        {tech.utilizationPct}%
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-center">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {tech.jobsCompletedToday}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">today</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Active Work Orders" description="Jobs currently on the floor" noPadding>
          <div className="p-4">
            <DataTable
              columns={columns}
              data={woData?.items ?? []}
              getRowId={(w) => w.id}
              total={woData?.total}
              page={lq.page}
              pageSize={lq.pageSize}
              onPageChange={lq.setPage}
              sort={lq.sort}
              onSortChange={lq.setSort}
              search={lq.search}
              onSearchChange={lq.setSearch}
              searchPlaceholder="Search work orders…"
              loading={woLoading}
              emptyTitle="No active work orders"
              emptyDescription="New job cards will appear here."
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
