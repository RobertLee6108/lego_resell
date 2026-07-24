import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeMonitoringSnapshot } from "./monitoringSummary";

function item(
  overrides: Partial<{
    title: string;
    mallName: string;
    effectivePrice: number;
    suspicious: boolean;
  }>,
) {
  return {
    title: "레고 72043 마리오와 스탠더드 카트",
    mallName: "테스트몰",
    effectivePrice: 80_000,
    suspicious: false,
    ...overrides,
  };
}

describe("summarizeMonitoringSnapshot", () => {
  it("picks the lowest eligible price and counts sellers", () => {
    const result = summarizeMonitoringSnapshot(
      [
        item({ mallName: "A몰", effectivePrice: 79_000 }),
        item({ mallName: "B몰", effectivePrice: 75_500 }),
        item({ mallName: "C몰", effectivePrice: 81_000 }),
      ],
      "72043",
    );
    assert.equal(result.marketLowestPrice, 75_500);
    assert.equal(result.sellerCount, 3);
    assert.equal(result.matchedSellerName, "B몰");
  });

  it("excludes variant-flagged and suspicious items from the summary", () => {
    const result = summarizeMonitoringSnapshot(
      [
        item({ mallName: "저가단품몰", effectivePrice: 10_000, title: "레고 72043 단품" }),
        item({ mallName: "호환몰", effectivePrice: 20_000, suspicious: true }),
        item({ mallName: "정상몰", effectivePrice: 79_000 }),
      ],
      "72043",
    );
    assert.equal(result.marketLowestPrice, 79_000);
    assert.equal(result.sellerCount, 1);
    assert.equal(result.matchedSellerName, "정상몰");
  });

  it("returns null lowest price when nothing is eligible", () => {
    const result = summarizeMonitoringSnapshot(
      [item({ title: "레고 71439 어드벤처" })],
      "72043",
    );
    assert.equal(result.marketLowestPrice, null);
    assert.equal(result.sellerCount, 0);
    assert.equal(result.matchedSellerName, null);
    assert.equal(result.items.length, 1);
  });
});
