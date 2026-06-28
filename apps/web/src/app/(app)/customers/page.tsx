"use client";

import { useRouter } from "next/navigation";
import { Crown, MessageCircle, Plus, Smile, Users } from "lucide-react";
import { formatMoney, formatRelativeTime, initials } from "@halo/utils";
import {
  Avatar,
  AvatarFallback,
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
import { StatusBadge } from "@/components/shared/status-badge";
import { useCustomers } from "@/lib/api/queries";
import { ErrorState } from "@/components/shared/states";
import { useListQuery } from "@/lib/use-list-query";
import type { Customer } from "@halo/types";

const TIER_FILTER = "all";

export default function CustomersPage() {
  const router = useRouter();
  const lq = useListQuery({ pageSize: 10 });
  const customersQuery = useCustomers(lq.query);
  const { data, isLoading } = customersQuery;

  const items = data?.items ?? [];

  // Derive simple stats from the current page of data (with sensible fallbacks).
  const reachable = items.filter((c) => c.whatsappReachable).length;
  const reachablePct = items.length > 0 ? Math.round((reachable / items.length) * 100) : 0;
  const avgSatisfaction =
    items.length > 0
      ? Math.round(items.reduce((sum, c) => sum + c.satisfactionScore, 0) / items.length)
      : 0;
  const premiumMembers = items.filter(
    (c) => c.loyaltyTier === "gold" || c.loyaltyTier === "platinum",
  ).length;

  const tierFilter =
    (typeof lq.filters?.loyaltyTier === "string" ? lq.filters.loyaltyTier : undefined) ??
    TIER_FILTER;

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      sortable: true,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(c.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{c.name}</p>
            <p className="truncate text-xs text-muted-foreground">{c.city}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (c) => <span className="tabular-nums text-muted-foreground">{c.phone}</span>,
    },
    {
      key: "loyaltyTier",
      header: "Loyalty",
      cell: (c) => <StatusBadge status={c.loyaltyTier} className="capitalize" />,
    },
    {
      key: "lifetimeValue",
      header: "Lifetime Value",
      sortable: true,
      align: "right",
      cell: (c) => (
        <span className="font-medium tabular-nums">{formatMoney(c.lifetimeValue)}</span>
      ),
    },
    {
      key: "satisfactionScore",
      header: "Satisfaction",
      sortable: true,
      cell: (c) => (
        <div className="flex items-center gap-2">
          <Progress value={c.satisfactionScore} className="h-1.5 w-20" />
          <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground">
            {Math.round(c.satisfactionScore)}%
          </span>
        </div>
      ),
    },
    {
      key: "whatsappReachable",
      header: "WhatsApp",
      cell: (c) =>
        c.whatsappReachable ? (
          <Badge variant="success">Reachable</Badge>
        ) : (
          <Badge variant="muted">Opted out</Badge>
        ),
    },
    {
      key: "lastVisitAt",
      header: "Last Visit",
      sortable: true,
      cell: (c) => (
        <span className="text-muted-foreground">
          {c.lastVisitAt ? formatRelativeTime(c.lastVisitAt) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Your complete customer relationship hub — loyalty, value and engagement at a glance."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Customers"
          value={data?.total ?? "—"}
          icon={Users}
          deltaPct={6.4}
          hint="active accounts"
          accent="blue"
          spark={[120, 124, 128, 131, 136, 140, 145, 152]}
        />
        <StatCard
          label="WhatsApp Reachable"
          value={`${reachablePct}%`}
          icon={MessageCircle}
          deltaPct={3.1}
          hint={`${reachable} of ${items.length} on this page`}
          accent="emerald"
        />
        <StatCard
          label="Avg Satisfaction"
          value={`${avgSatisfaction}%`}
          icon={Smile}
          deltaPct={1.8}
          hint="CSAT, current view"
          accent="amber"
        />
        <StatCard
          label="Gold + Platinum"
          value={premiumMembers}
          icon={Crown}
          deltaPct={4.2}
          hint="premium loyalty members"
          accent="violet"
        />
      </div>

      {customersQuery.isError ? (
        <ErrorState onRetry={() => customersQuery.refetch()} />
      ) : (
      <DataTable
        columns={columns}
        data={items}
        getRowId={(c) => c.id}
        total={data?.total}
        page={lq.page}
        pageSize={lq.pageSize}
        onPageChange={lq.setPage}
        sort={lq.sort}
        onSortChange={lq.setSort}
        search={lq.search}
        onSearchChange={lq.setSearch}
        searchPlaceholder="Search customers…"
        loading={isLoading}
        selectable
        onRowClick={(c) => router.push(`/customers/${c.id}`)}
        toolbar={
          <Select
            value={tierFilter}
            onValueChange={(value) =>
              lq.setFilter("loyaltyTier", value === TIER_FILTER ? undefined : value)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TIER_FILTER}>All tiers</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      )}
    </div>
  );
}
