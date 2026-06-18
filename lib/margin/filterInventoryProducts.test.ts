import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InventorySummary } from "@/lib/inventory/types";
import {
  filterInventoryProductsByQuery,
  matchesInventoryProductQuery,
} from "./filterInventoryProducts";

function product(
  overrides: Partial<InventorySummary> & Pick<InventorySummary, "product_number" | "name">,
): InventorySummary {
  return {
    msrp: 0,
    status: "available",
    total_sourced: 1,
    total_sold: 0,
    current_stock: 0,
    avg_cost: 50_000,
    stock_value: 0,
    ...overrides,
  };
}

describe("filterInventoryProducts", () => {
  it("matches product number substring", () => {
    const row = product({ product_number: "72046", name: "Game Boy" });
    assert.equal(matchesInventoryProductQuery(row, "72046"), true);
    assert.equal(matchesInventoryProductQuery(row, "720"), true);
  });

  it("matches product name", () => {
    const row = product({ product_number: "10373", name: "보태니컬 미니분재" });
    assert.equal(matchesInventoryProductQuery(row, "보태니컬"), true);
  });

  it("returns empty when query is blank", () => {
    const rows = [product({ product_number: "72046", name: "A" })];
    assert.equal(filterInventoryProductsByQuery(rows, "").length, 0);
    assert.equal(filterInventoryProductsByQuery(rows, "   ").length, 0);
  });

  it("filters list by query", () => {
    const rows = [
      product({ product_number: "72046", name: "A" }),
      product({ product_number: "10373", name: "B" }),
    ];
    assert.equal(filterInventoryProductsByQuery(rows, "72046").length, 1);
  });
});
