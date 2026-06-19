import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  recommendedQueriesForProduct,
  recommendedQueriesFromTitles,
} from "./suggestions";

describe("naver shopping suggestions", () => {
  it("builds product-number focused queries", () => {
    const suggestions = recommendedQueriesForProduct({
      product_number: "72046",
      name: "레고 슈퍼마리오 Game Boy",
    });
    assert.ok(suggestions.includes("72046"));
    assert.ok(suggestions.includes("레고 72046"));
  });

  it("extracts repeated title tokens", () => {
    const suggestions = recommendedQueriesFromTitles([
      "레고 72046 Game Boy 정품",
      "레고 72046 게임보이 새상품",
      "레고 10373 보태니컬",
    ]);
    assert.equal(suggestions[0], "72046");
  });
});
