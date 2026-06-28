"use client";

import * as React from "react";
import type { ListQuery, SortState } from "@halo/types";

/**
 * Manages the controlled state for a DataTable (search, sort, paging, filters)
 * with debounced search so we don't refetch on every keystroke.
 */
export function useListQuery(initial?: Partial<ListQuery>) {
  const [page, setPage] = React.useState(initial?.page ?? 1);
  const [pageSize] = React.useState(initial?.pageSize ?? 10);
  const [searchInput, setSearchInput] = React.useState(initial?.search ?? "");
  const [search, setSearch] = React.useState(initial?.search ?? "");
  const [sort, setSort] = React.useState<SortState | undefined>(initial?.sort);
  const [filters, setFilters] = React.useState<ListQuery["filters"]>(initial?.filters ?? {});

  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setFilter = React.useCallback((key: string, value: string | string[] | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const query: ListQuery = React.useMemo(
    () => ({ page, pageSize, search, sort, filters }),
    [page, pageSize, search, sort, filters],
  );

  return {
    query,
    page,
    pageSize,
    setPage,
    search: searchInput,
    setSearch: setSearchInput,
    sort,
    setSort,
    filters,
    setFilter,
  };
}
