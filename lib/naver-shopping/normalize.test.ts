import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeNaverShoppingItem } from "./normalize";
import type { NaverShoppingApiItem } from "./types";

const item: NaverShoppingApiItem = {
  title: "<b>레고</b> 72046 Game Boy",
  link: "https://example.com",
  image: "",
  lprice: "80010",
  hprice: "0",
  mallName: "테스트몰",
  productId: "123",
  productType: "2",
  maker: "",
  brand: "LEGO",
  category1: "출산/육아",
  category2: "완구",
  category3: "블록",
  category4: "",
};

describe("normalizeNaverShoppingItem", () => {
  it("cleans title and parses prices", () => {
    const normalized = normalizeNaverShoppingItem(item, "72046", "72046");
    assert.equal(normalized.title, "레고 72046 Game Boy");
    assert.equal(normalized.lprice, 80_010);
    assert.equal(normalized.hprice, 0);
    assert.equal(normalized.maker, null);
    assert.equal(normalized.brand, "LEGO");
    assert.equal(normalized.effectivePrice, 80_010);
  });
});
