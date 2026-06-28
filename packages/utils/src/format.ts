import type { Money } from "@halo/types";

const CURRENCY_LOCALE: Record<Money["currency"], string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
};

/** Format integer minor units into a localized currency string. */
export function formatMoney(money: Money, options?: { compact?: boolean }): string {
  const major = money.amountMinor / 100;
  return new Intl.NumberFormat(CURRENCY_LOCALE[money.currency], {
    style: "currency",
    currency: money.currency,
    notation: options?.compact ? "compact" : "standard",
    maximumFractionDigits: options?.compact ? 1 : 0,
  }).format(major);
}

export function money(amountMinor: number, currency: Money["currency"] = "INR"): Money {
  return { amountMinor, currency };
}

export function formatNumber(value: number, options?: { compact?: boolean }): string {
  return new Intl.NumberFormat("en-IN", {
    notation: options?.compact ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatDate(iso: string, style: "short" | "medium" | "long" = "medium"): string {
  const date = new Date(iso);
  const opts: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "2-digit", month: "short" }
      : style === "long"
        ? { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }
        : { day: "2-digit", month: "short", year: "numeric" };
  return new Intl.DateTimeFormat("en-IN", opts).format(date);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

/** Human relative time ("3h ago", "in 2d"). Deterministic given a `now`. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ];
  let duration = diffMs / 1000;
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(Math.round(duration), "year");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Title-case a snake_case enum value for display. */
export function humanize(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
