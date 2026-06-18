import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupProductsByTheme } from "./groupProductsByTheme";
import type { ProductCardProps } from "@/components/products/ProductCard";

const base: Omit<ProductCardProps, "productNumber" | "name" | "themeId" | "themeName"> = {
  msrp: 100_000,
  status: "on_sale",
};

const themes = [
  { value: "theme-a", label: "아이디어" },
  { value: "theme-b", label: "크리에이터" },
];

describe("groupProductsByTheme", () => {
  it("groups by theme order and puts uncategorized last", () => {
    const products: ProductCardProps[] = [
      {
        ...base,
        productNumber: "1",
        name: "P1",
        themeId: "theme-b",
        themeName: "크리에이터",
      },
      {
        ...base,
        productNumber: "2",
        name: "P2",
        themeId: null,
        themeName: null,
      },
      {
        ...base,
        productNumber: "3",
        name: "P3",
        themeId: "theme-a",
        themeName: "아이디어",
      },
    ];

    const groups = groupProductsByTheme(products, themes);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].themeName, "아이디어");
    assert.equal(groups[0].products.length, 1);
    assert.equal(groups[1].themeName, "크리에이터");
    assert.equal(groups[2].themeName, "미분류");
  });

  it("merges unknown theme ids into uncategorized", () => {
    const products: ProductCardProps[] = [
      {
        ...base,
        productNumber: "9",
        name: "Orphan",
        themeId: "deleted-theme",
        themeName: "삭제됨",
      },
    ];

    const groups = groupProductsByTheme(products, themes);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].themeName, "미분류");
  });

  it("omits empty theme sections", () => {
    const groups = groupProductsByTheme([], themes);
    assert.equal(groups.length, 0);
  });
});
