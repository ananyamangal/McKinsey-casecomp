"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@halo/utils";
import type { SortState } from "@halo/types";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Skeleton,
} from "@halo/ui";
import { EmptyState } from "./states";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  hideable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  cell: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  sort?: SortState;
  onSortChange?: (sort: SortState | undefined) => void;
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  toolbar?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  total = data.length,
  page = 1,
  pageSize = 10,
  onPageChange,
  sort,
  onSortChange,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  loading,
  onRowClick,
  selectable,
  toolbar,
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filters.",
}: DataTableProps<T>) {
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const visibleColumns = columns.filter((c) => !hidden.has(c.key));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    if (sort?.field !== key) onSortChange({ field: key, direction: "asc" });
    else if (sort.direction === "asc") onSortChange({ field: key, direction: "desc" });
    else onSortChange(undefined);
  };

  const allSelected = data.length > 0 && data.every((r) => selected.has(getRowId(r)));
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(data.map(getRowId)));
  };
  const toggleRow = (rid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {onSearchChange && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          {toolbar}
        </div>
        <div className="flex items-center gap-2">
          {selectable && selected.size > 0 && (
            <Badge variant="info">{selected.size} selected</Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns
                .filter((c) => c.hideable !== false)
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={!hidden.has(c.key)}
                    onCheckedChange={() =>
                      setHidden((prev) => {
                        const next = new Set(prev);
                        next.has(c.key) ? next.delete(c.key) : next.add(c.key);
                        return next;
                      })
                    }
                  >
                    {c.header}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {selectable && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </th>
                )}
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "sticky top-0 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.headerClassName,
                    )}
                  >
                    {col.sortable && onSortChange ? (
                      <button
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                          col.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {col.header}
                        {sort?.field === col.key ? (
                          sort.direction === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {selectable && (
                      <td className="px-4 py-3.5">
                        <Skeleton className="h-4 w-4" />
                      </td>
                    )}
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5">
                        <Skeleton className="h-4 w-[70%]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + (selectable ? 1 : 0)}>
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      className="border-0 bg-transparent"
                    />
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const rid = getRowId(row);
                  return (
                    <tr
                      key={rid}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "border-b border-border transition-colors last:border-0 hover:bg-accent/40",
                        onRowClick && "cursor-pointer",
                        selected.has(rid) && "bg-primary/[0.04]",
                      )}
                    >
                      {selectable && (
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(rid)}
                            onChange={() => toggleRow(rid)}
                            aria-label="Select row"
                            className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                          />
                        </td>
                      )}
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-3.5 text-foreground",
                            col.align === "right" && "text-right",
                            col.align === "center" && "text-center",
                            col.className,
                          )}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {onPageChange && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total === 0
              ? "0 results"
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="px-2 text-sm font-medium text-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
