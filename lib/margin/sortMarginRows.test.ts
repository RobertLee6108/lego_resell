import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MarginSummary } from "./types";
import { sortMarginRows } from "./sortMarginRows";

function row(
  overrides: Partial<MarginSummary> & Pick<MarginSummary, "product_number" | "name">,
): MarginSummary {
  return {
    msrp: 0,
    total_sold: 0,
    total_revenue: 0,
    total_platform_fee: 0,
    total_shipping_out: 0,
    total_cost_basis: 0,
    net_profit: 0,
    roi_pct: null,
    ...overrides,
  };
}

describe("sortMarginRows", () => {
  it("sorts net_profit descending", () => {
    const rows = [
      row({ product_number: "1", name: "A", net_profit: 10_000 }),
      row({ product_number: "2", name: "B", net_profit: 50_000 }),
      row({ product_number: "3", name: "C", net_profit: 30_000 }),
    ];
    const sorted = sortMarginRows(rows, "net_profit", "desc");
    assert.deepEqual(
      sorted.map((r) => r.product_number),
      ["2", "3", "1"],
    );
  });

  it("sorts net_profit ascending", () => {
    const rows = [
      row({ product_number: "1", name: "A", net_profit: 10_000 }),
      row({ product_number: "2", name: "B", net_profit: 50_000 }),
    ];
    const sorted = sortMarginRows(rows, "net_profit", "asc");
    assert.deepEqual(
      sorted.map((r) => r.product_number),
      ["1", "2"],
    );
  });

  it("puts null roi_pct rows at the bottom", () => {
    const rows = [
      row({ product_number: "1", name: "A", roi_pct: 20 }),
      row({ product_number: "2", name: "B", roi_pct: null }),
      row({ product_number: "3", name: "C", roi_pct: 5 }),
    ];
    const asc = sortMarginRows(rows, "roi_pct", "asc");
    assert.deepEqual(
      asc.map((r) => r.product_number),
      ["3", "1", "2"],
    );
    const desc = sortMarginRows(rows, "roi_pct", "desc");
    assert.deepEqual(
      desc.map((r) => r.product_number),
      ["1", "3", "2"],
    );
  });

  it("sorts product names in Korean locale order", () => {
    const rows = [
      row({ product_number: "3", name: "창의력" }),
      row({ product_number: "1", name: "가나다" }),
      row({ product_number: "2", name: "나비" }),
    ];
    const sorted = sortMarginRows(rows, "product", "asc");
    assert.deepEqual(
      sorted.map((r) => r.name),
      ["가나다", "나비", "창의력"],
    );
  });
});
