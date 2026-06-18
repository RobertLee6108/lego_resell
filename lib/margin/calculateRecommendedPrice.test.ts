import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  recommendPriceByMarginRate,
  recommendPriceByTargetProfit,
} from "./calculateRecommendedPrice";

describe("calculateRecommendedPrice", () => {
  it("recommends price for target profit with platform fee", () => {
    const result = recommendPriceByTargetProfit(120_000, 50_000, 6, 3_000);
    assert.ok(result);
    assert.ok(result.net_profit >= 50_000);
    assert.equal(result.platform_fee, Math.round(result.recommended_price * 0.06));
  });

  it("recommends price for margin rate on cost", () => {
    const result = recommendPriceByMarginRate(100_000, 30, 0, 0);
    assert.ok(result);
    assert.ok(result.net_profit >= 30_000);
  });

  it("returns null for invalid fee rate", () => {
    assert.equal(recommendPriceByTargetProfit(100_000, 10_000, 100, 0), null);
  });
});
