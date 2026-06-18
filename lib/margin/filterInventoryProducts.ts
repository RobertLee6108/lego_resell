import type { InventorySummary } from "@/lib/inventory/types";

export function matchesInventoryProductQuery(
  row: InventorySummary,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  const productNumber = row.product_number.toLowerCase();
  const name = row.name.toLowerCase();

  if (productNumber.includes(q) || name.includes(q)) return true;

  const qDigits = q.replace(/\D/g, "");
  if (qDigits.length > 0 && productNumber.replace(/\D/g, "").includes(qDigits)) {
    return true;
  }

  return false;
}

export function filterInventoryProductsByQuery(
  products: InventorySummary[],
  query: string,
): InventorySummary[] {
  return products.filter((p) => matchesInventoryProductQuery(p, query));
}
