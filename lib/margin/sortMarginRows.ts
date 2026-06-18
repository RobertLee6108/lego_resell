import type { MarginSummary } from "@/lib/margin/types";

export type MarginSortKey =
  | "product"
  | "total_sold"
  | "total_revenue"
  | "total_cost_basis"
  | "total_platform_fee"
  | "total_shipping_out"
  | "net_profit"
  | "roi_pct";

export type SortDirection = "asc" | "desc";

export function defaultSortDirectionForKey(key: MarginSortKey): SortDirection {
  return key === "product" ? "asc" : "desc";
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: SortDirection,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const diff = a - b;
  return direction === "asc" ? diff : -diff;
}

function compareNumber(
  a: number,
  b: number,
  direction: SortDirection,
): number {
  const diff = a - b;
  return direction === "asc" ? diff : -diff;
}

function compareProduct(
  a: MarginSummary,
  b: MarginSummary,
  direction: SortDirection,
): number {
  const nameCmp = a.name.localeCompare(b.name, "ko");
  const cmp =
    nameCmp !== 0
      ? nameCmp
      : a.product_number.localeCompare(b.product_number, "ko");
  return direction === "asc" ? cmp : -cmp;
}

function compareRows(
  a: MarginSummary,
  b: MarginSummary,
  key: MarginSortKey,
  direction: SortDirection,
): number {
  switch (key) {
    case "product":
      return compareProduct(a, b, direction);
    case "total_sold":
      return compareNumber(a.total_sold, b.total_sold, direction);
    case "total_revenue":
      return compareNumber(a.total_revenue, b.total_revenue, direction);
    case "total_cost_basis":
      return compareNumber(a.total_cost_basis, b.total_cost_basis, direction);
    case "total_platform_fee":
      return compareNumber(a.total_platform_fee, b.total_platform_fee, direction);
    case "total_shipping_out":
      return compareNumber(a.total_shipping_out, b.total_shipping_out, direction);
    case "net_profit":
      return compareNumber(a.net_profit, b.net_profit, direction);
    case "roi_pct":
      return compareNullableNumber(a.roi_pct, b.roi_pct, direction);
  }
}

export function sortMarginRows(
  rows: MarginSummary[],
  key: MarginSortKey,
  direction: SortDirection,
): MarginSummary[] {
  return [...rows].sort((a, b) => compareRows(a, b, key, direction));
}
