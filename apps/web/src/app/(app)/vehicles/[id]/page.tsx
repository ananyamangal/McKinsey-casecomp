"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Car,
  CalendarClock,
  Gauge,
  Package,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatRelativeTime,
} from "@halo/utils";
import { Badge, Button, Progress, Separator, Skeleton } from "@halo/ui";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { ProgressRing } from "@/components/shared/progress-ring";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import {
  useVehicle,
  useVehiclePredictions,
  useVehicleTelematics,
} from "@/lib/api/queries";
import type { InstalledPart } from "@halo/types";

function healthColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#d97706";
  return "#e11d48";
}

function remainingIndicator(pct: number): string {
  if (pct >= 50) return "bg-emerald-500";
  if (pct >= 25) return "bg-amber-500";
  return "bg-rose-500";
}

const INSTALLED_PARTS: InstalledPart[] = [
  {
    partId: "P-9001",
    name: "Front Brake Pad Set",
    sku: "BRK-FP-220",
    installedAt: "2026-02-14T10:00:00.000Z",
    mileageAtInstallKm: 38200,
  },
  {
    partId: "P-9002",
    name: "Synthetic Engine Oil 5W-30 (5L)",
    sku: "OIL-SYN-530",
    installedAt: "2026-02-14T10:00:00.000Z",
    mileageAtInstallKm: 38200,
  },
  {
    partId: "P-9003",
    name: "Cabin Air Filter",
    sku: "FLT-CAB-118",
    installedAt: "2025-09-02T09:30:00.000Z",
    mileageAtInstallKm: 29850,
  },
  {
    partId: "P-9004",
    name: "12V AGM Battery",
    sku: "BAT-AGM-70",
    installedAt: "2025-04-21T11:15:00.000Z",
    mileageAtInstallKm: 21100,
  },
];

const SERVICE_TIMELINE: TimelineItem[] = [
  {
    id: "svc-5",
    title: "Major Service — 40,000 km",
    subtitle: "Brake pads, oil & filters replaced. Health restored to 92%.",
    meta: "14 Feb 2026",
    status: "succeeded",
  },
  {
    id: "svc-4",
    title: "Telematics Alert — Brake wear",
    subtitle: "Proactive booking suggested by Aria agent.",
    meta: "02 Feb 2026",
    status: "succeeded",
  },
  {
    id: "svc-3",
    title: "Interim Service — 30,000 km",
    subtitle: "Cabin filter replaced, multi-point inspection passed.",
    meta: "02 Sep 2025",
    status: "succeeded",
  },
  {
    id: "svc-2",
    title: "Warranty Repair — Infotainment",
    subtitle: "Head unit firmware reflashed under warranty.",
    meta: "21 Apr 2025",
    status: "succeeded",
  },
  {
    id: "svc-1",
    title: "Vehicle Delivered",
    subtitle: "PDI completed, telematics device paired.",
    meta: "08 Jan 2025",
    status: "succeeded",
  },
];

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const vehicleQuery = useVehicle(id);
  const { data: vehicle, isLoading } = vehicleQuery;
  const { data: telematics = [] } = useVehicleTelematics(id);
  const { data: predictions = [] } = useVehiclePredictions(id);

  if (vehicleQuery.isError) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/vehicles">
            <ArrowLeft className="h-4 w-4" /> Back to vehicles
          </Link>
        </Button>
        <ErrorState onRetry={() => vehicleQuery.refetch()} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/vehicles">
            <ArrowLeft className="h-4 w-4" /> Back to vehicles
          </Link>
        </Button>
        <EmptyState
          icon={Car}
          title="Vehicle not found"
          description="This vehicle may have been removed or the link is incorrect."
          action={
            <Button asChild size="sm">
              <Link href="/vehicles">Browse vehicles</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const warrantyActive = Boolean(vehicle.warrantyValidUntil);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/vehicles">
          <ArrowLeft className="h-4 w-4" /> Back to vehicles
        </Link>
      </Button>

      <PageHeader
        title={`${vehicle.make} ${vehicle.model}`}
        description={`${vehicle.variant} · ${vehicle.year} · ${vehicle.color}`}
        actions={
          warrantyActive ? (
            <Badge variant="success">
              <ShieldCheck className="h-3.5 w-3.5" /> Under Warranty
            </Badge>
          ) : (
            <Badge variant="muted">Warranty Expired</Badge>
          )
        }
      />

      {/* Hero */}
      <SectionCard contentClassName="pt-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap gap-x-10 gap-y-5">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Registration
              </p>
              <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-1 font-mono text-sm font-semibold tracking-wide text-foreground">
                {vehicle.registration}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                VIN
              </p>
              <p className="font-mono text-sm text-foreground">{vehicle.vin}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Chassis No.
              </p>
              <p className="font-mono text-sm text-foreground">{vehicle.chassisNumber}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Owner
              </p>
              <Link
                href={`/customers/${vehicle.ownerId}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <User className="h-3.5 w-3.5" />
                {vehicle.ownerName}
              </Link>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Odometer
              </p>
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                {formatNumber(vehicle.mileageKm)} km
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2">
            <ProgressRing
              value={vehicle.healthScore}
              size={104}
              strokeWidth={9}
              color={healthColor(vehicle.healthScore)}
            />
            <p className="text-xs font-medium text-muted-foreground">Health Score</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Telematics */}
        <SectionCard
          title="Telematics"
          description="Latest signals from the connected device"
          action={<Activity className="h-4 w-4 text-muted-foreground" />}
        >
          {telematics.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No telematics yet"
              description="No signals have been recorded for this vehicle."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {telematics.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{event.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(event.recordedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatNumber(event.value)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {event.unit}
                      </span>
                    </span>
                    <StatusBadge status={event.severity} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Predicted Maintenance */}
        <SectionCard
          title="Predicted Maintenance"
          description="AI forecasts based on usage & telematics"
          action={<Wrench className="h-4 w-4 text-muted-foreground" />}
        >
          {predictions.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No predictions"
              description="No upcoming maintenance has been predicted."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="space-y-4">
              {predictions.map((p) => (
                <li key={`${p.vehicleId}-${p.component}`} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{p.component}</p>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatMoney(p.estimatedCost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={p.remainingPct}
                      indicatorClassName={remainingIndicator(p.remainingPct)}
                      className="h-1.5 flex-1"
                    />
                    <span className="w-12 text-right text-xs font-medium tabular-nums text-muted-foreground">
                      {Math.round(p.remainingPct)}% left
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Due {formatDate(p.predictedDueDate, "medium")}
                    </span>
                    <span>{Math.round(p.confidence * 100)}% confidence</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Warranty & details */}
        <SectionCard title="Warranty & Details" description="Coverage and registry record">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Warranty status</dt>
              <dd>
                {warrantyActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="muted">Expired</Badge>
                )}
              </dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Valid until</dt>
              <dd className="font-medium text-foreground">
                {vehicle.warrantyValidUntil
                  ? formatDate(vehicle.warrantyValidUntil, "long")
                  : "—"}
              </dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Model year</dt>
              <dd className="font-medium text-foreground">{vehicle.year}</dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Colour</dt>
              <dd className="font-medium text-foreground">{vehicle.color}</dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Next service due</dt>
              <dd className="font-medium text-foreground">
                {vehicle.nextServiceDueKm !== undefined
                  ? `${formatNumber(vehicle.nextServiceDueKm)} km`
                  : "—"}
              </dd>
            </div>
          </dl>
        </SectionCard>

        {/* Service Timeline */}
        <SectionCard title="Service Timeline" description="Recent history & events">
          <Timeline items={SERVICE_TIMELINE} />
        </SectionCard>
      </div>

      {/* Installed Parts */}
      <SectionCard
        title="Installed Parts"
        description="Components fitted during prior services"
        action={<Package className="h-4 w-4 text-muted-foreground" />}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Part
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SKU
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mileage
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Installed
                </th>
              </tr>
            </thead>
            <tbody>
              {INSTALLED_PARTS.map((part) => (
                <tr key={part.partId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3.5 font-medium text-foreground">{part.name}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-muted-foreground">{part.sku}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-foreground">
                    {formatNumber(part.mileageAtInstallKm)} km
                  </td>
                  <td className="px-4 py-3.5 text-right text-muted-foreground">
                    {formatDate(part.installedAt, "medium")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
