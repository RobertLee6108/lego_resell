import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lowestNaverShoppingItem, sortNaverShoppingItems } from "./sort";
import type { NaverShoppingItem } from "./types";

function item(overrides: Partial<NaverShoppingItem>): NaverShoppingItem {
  return {
    query: "레고",
    productNumber: null,
    title: "상품",
    link: "https://example.com",
    image: null,
    mallName: "몰",
    lprice: 0,
    hprice: 0,
    productId: "0",
    productType: 2,
    maker: null,
    brand: null,
    category1: null,
    category2: null,
    category3: null,
    category4: null,
    shippingFeeOverride: null,
    effectivePrice: 0,
    raw: {} as NaverShoppingItem["raw"],
    ...overrides,
  };
}

describe("sortNaverShoppingItems", () => {
  it("sorts by effective price", () => {
    const rows = [
      item({ productId: "1", lprice: 10_000, shippingFeeOverride: 3_000 }),
      item({ productId: "2", lprice: 11_000, shippingFeeOverride: 0 }),
    ];
    const sorted = sortNaverShoppingItems(rows, "effective_asc");
    assert.deepEqual(sorted.map((r) => r.productId), ["2", "1"]);
  });

  it("finds lowest with shipping", () => {
    const rows = [
      item({ productId: "1", lprice: 10_000, shippingFeeOverride: 3_000 }),
      item({ productId: "2", lprice: 11_000, shippingFeeOverride: 0 }),
    ];
    assert.equal(lowestNaverShoppingItem(rows, true)?.productId, "2");
    assert.equal(lowestNaverShoppingItem(rows, false)?.productId, "1");
  });
});
