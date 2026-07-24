import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateTargetPrice } from "./pricing";

describe("calculateTargetPrice", () => {
  it("uses catalog lowest minus 100 when it is above the margin floor", () => {
    const price = calculateTargetPrice(
      { min_margin_won: 3_000, bep_price: 50_000, floor_price: null },
      80_000,
    );
    assert.equal(price, 79_900);
  });

  it("falls back to BEP + min margin when catalog price would be too low", () => {
    const price = calculateTargetPrice(
      { min_margin_won: 3_000, bep_price: 50_000, floor_price: null },
      51_000,
    );
    assert.equal(price, 53_000);
  });

  it("never goes below an explicit hard floor", () => {
    const price = calculateTargetPrice(
      { min_margin_won: 3_000, bep_price: 50_000, floor_price: 60_000 },
      51_000,
    );
    assert.equal(price, 60_000);
  });
});
