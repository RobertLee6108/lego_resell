import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateNaverItemForRepricing,
  isVariantFlagged,
  productNumberAppearsInTitle,
} from "./matching";

describe("productNumberAppearsInTitle", () => {
  it("matches when the product number is a standalone token", () => {
    assert.equal(productNumberAppearsInTitle("레고 72043 마리오와 스탠더드 카트", "72043"), true);
  });

  it("does not match when the product number is part of a longer number", () => {
    assert.equal(productNumberAppearsInTitle("레고 720430 미니피규어", "72043"), false);
    assert.equal(productNumberAppearsInTitle("레고 172043 세트", "72043"), false);
  });

  it("does not match unrelated titles", () => {
    assert.equal(productNumberAppearsInTitle("레고 71439 어드벤처", "72043"), false);
  });
});

describe("isVariantFlagged", () => {
  it("flags known variant keywords", () => {
    assert.equal(isVariantFlagged("레고 72043 (미니피규어 제외)"), true);
    assert.equal(isVariantFlagged("레고 72043 단품"), true);
    assert.equal(isVariantFlagged("레고 72043 벌크 포장"), true);
  });

  it("does not flag normal titles", () => {
    assert.equal(isVariantFlagged("레고 72043 마리오와 스탠더드 카트"), false);
  });
});

describe("evaluateNaverItemForRepricing", () => {
  it("is eligible when matched, not variant-flagged, and not suspicious", () => {
    const result = evaluateNaverItemForRepricing(
      { title: "레고 72043 마리오와 스탠더드 카트", suspicious: false },
      "72043",
    );
    assert.deepEqual(result, {
      productNumberMatch: true,
      variantFlagged: false,
      eligibleForAutoMatch: true,
    });
  });

  it("is not eligible when variant-flagged even if matched", () => {
    const result = evaluateNaverItemForRepricing(
      { title: "레고 72043 단품 (미니피규어 제외)", suspicious: false },
      "72043",
    );
    assert.equal(result.productNumberMatch, true);
    assert.equal(result.variantFlagged, true);
    assert.equal(result.eligibleForAutoMatch, false);
  });

  it("is not eligible when suspicious", () => {
    const result = evaluateNaverItemForRepricing(
      { title: "레고 72043 호환 LED 조명 키트", suspicious: true },
      "72043",
    );
    assert.equal(result.productNumberMatch, true);
    assert.equal(result.eligibleForAutoMatch, false);
  });

  it("is not eligible when the product number does not appear", () => {
    const result = evaluateNaverItemForRepricing(
      { title: "레고 71439 어드벤처", suspicious: false },
      "72043",
    );
    assert.equal(result.productNumberMatch, false);
    assert.equal(result.eligibleForAutoMatch, false);
  });
});
