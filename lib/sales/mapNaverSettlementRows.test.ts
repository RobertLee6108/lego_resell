import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapNaverSettlementRows } from "./mapNaverSettlementRows";
import type { NaverParsedRow } from "./naverSettlementTypes";

const products = [
  { product_number: "10316", name: "레고 10316" },
  { product_number: "42100", name: "레고 42100" },
];

const parsedRow: NaverParsedRow = {
  rowIndex: 2,
  external_order_id: "202501010001",
  order_id: "ORD-1",
  seller_product_code: "10316",
  option_manage_code: null,
  product_name: "레고 세트",
  quantity: 2,
  payment_amount: 200_000,
  fee_amount: 11_300,
  payment_date: "2025-01-16",
  settlement_date: null,
  purchase_confirm_date: null,
};

describe("mapNaverSettlementRows", () => {
  it("auto-matches seller product code", () => {
    const [row] = mapNaverSettlementRows(
      [parsedRow],
      products,
      "payment",
      new Set(),
    );
    assert.equal(row.status, "ready");
    assert.equal(row.product_number, "10316");
    assert.equal(row.match_source, "seller_code");
    assert.equal(row.unit_sale_price, 100_000);
  });

  it("marks duplicate external order ids", () => {
    const [row] = mapNaverSettlementRows(
      [parsedRow],
      products,
      "payment",
      new Set(["202501010001"]),
    );
    assert.equal(row.status, "duplicate");
  });

  it("supports manual mapping for unmatched rows", () => {
    const unmatched = { ...parsedRow, seller_product_code: "UNKNOWN" };
    const [row] = mapNaverSettlementRows(
      [unmatched],
      products,
      "payment",
      new Set(),
      { 2: "42100" },
    );
    assert.equal(row.status, "ready");
    assert.equal(row.product_number, "42100");
    assert.equal(row.match_source, "manual");
  });
});
