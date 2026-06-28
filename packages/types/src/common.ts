/**
 * Cross-cutting primitives shared by every domain entity.
 * Keeping these in one place means pagination, sorting and the
 * envelope shape stay identical across web and (future) API client.
 */

export type ID = string;
export type ISODateString = string;

/** Base fields every persisted entity carries. */
export interface BaseEntity {
  id: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  field: string;
  direction: SortDirection;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Standard list-query input used by every table-backed feature. */
export interface ListQuery extends PaginationParams {
  search?: string;
  sort?: SortState;
  filters?: Record<string, string | string[] | undefined>;
}

/** Monetary amounts are stored as integer minor units (paise) to avoid float drift. */
export interface Money {
  /** Amount in minor units (e.g. paise). */
  amountMinor: number;
  currency: "INR" | "USD" | "EUR";
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface DeltaMetric {
  value: number;
  /** Percentage change vs. previous period. */
  deltaPct: number;
  direction: "up" | "down" | "flat";
}
