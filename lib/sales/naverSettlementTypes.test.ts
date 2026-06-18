import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calcPlatformFeeRate,
  normalizeDate,
  resolveSoldAt,
} from "./naverSettlementTypes";
import type { NaverParsedRow } from "./naverSettlementTypes";

const baseRow: NaverParsedRow = {
  rowIndex: 1,
  external_order_id: "ORD-1",
  order_id: null,
  seller_product_code: "10316",
  option_manage_code: null,
  product_name: "레고",
  quantity: 1,
  payment_amount: 150_000,
  fee_amount: 8_475,
  payment_date: "2025-01-15",
  settlement_date: "2025.1.20",
  purchase_confirm_date: "20250125",
};

describe("naverSettlementTypes", () => {
  it("normalizeDate supports ISO, dotted, compact", () => {
    assert.equal(normalizeDate("2025-01-15"), "2025-01-15");
    assert.equal(normalizeDate("2025.1.5"), "2025-01-05");
    assert.equal(normalizeDate("20250125"), "2025-01-25");
  });

  it("resolveSoldAt picks field by soldAtField", () => {
    assert.equal(resolveSoldAt(baseRow, "payment"), "2025-01-15");
    assert.equal(resolveSoldAt(baseRow, "settlement"), "2025-01-20");
    assert.equal(resolveSoldAt(baseRow, "purchase_confirm"), "2025-01-25");
  });

  it("calcPlatformFeeRate rounds to 2 decimals", () => {
    assert.equal(calcPlatformFeeRate(150_000, 8_475), 5.65);
  });
});
