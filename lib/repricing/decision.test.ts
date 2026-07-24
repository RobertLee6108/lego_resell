import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideReprice, evaluateSoonOutOfStockHold } from "./decision";

describe("decideReprice", () => {
  it("does nothing when the gap is within the dead zone", () => {
    const result = decideReprice({
      currentPrice: 80_000,
      targetPrice: 79_800,
      deadZoneWon: 500,
      bepPrice: 50_000,
      persistenceHours: 0,
    });
    assert.deepEqual(result, { action: "no_change", reason: "within_dead_zone" });
  });

  it("waits for persistence when the gap exceeds the dead zone but not 2x", () => {
    const result = decideReprice({
      currentPrice: 80_000,
      targetPrice: 79_000, // gap 1000, dead zone 500, 2x = 1000 (not exceeded)
      deadZoneWon: 500,
      bepPrice: 50_000,
      persistenceHours: 1,
    });
    assert.deepEqual(result, { action: "no_change", reason: "insufficient_persistence" });
  });

  it("reprices once persistence is confirmed", () => {
    const result = decideReprice({
      currentPrice: 80_000,
      targetPrice: 79_000,
      deadZoneWon: 500,
      bepPrice: 50_000,
      persistenceHours: 3,
    });
    assert.equal(result.action, "reprice");
    if (result.action === "reprice") {
      assert.equal(result.newPrice, 79_000);
      assert.equal(result.triggerReason, "persistence_confirmed");
      assert.equal(result.requiresApproval, false);
    }
  });

  it("reacts immediately when the gap exceeds 2x the dead zone, ignoring persistence", () => {
    const result = decideReprice({
      currentPrice: 80_000,
      targetPrice: 78_900, // gap 1100 > 2 * 500
      deadZoneWon: 500,
      bepPrice: 50_000,
      persistenceHours: 0,
    });
    assert.equal(result.action, "reprice");
    if (result.action === "reprice") {
      assert.equal(result.triggerReason, "dead_zone_exceeded");
    }
  });

  it("caps a single drop at 10% of the current price", () => {
    const result = decideReprice({
      currentPrice: 10_000,
      targetPrice: 5_000, // would be a 50% drop
      deadZoneWon: 500,
      bepPrice: 0,
      persistenceHours: 3,
    });
    assert.equal(result.action, "reprice");
    if (result.action === "reprice") {
      assert.equal(result.newPrice, 9_000);
    }
  });

  it("requires approval when the capped price would still fall below BEP", () => {
    const result = decideReprice({
      currentPrice: 80_000,
      targetPrice: 60_000,
      deadZoneWon: 500,
      bepPrice: 75_000,
      persistenceHours: 3,
    });
    assert.equal(result.action, "reprice");
    if (result.action === "reprice") {
      // capped to 72,000 (10% max drop), still below BEP 75,000
      assert.equal(result.newPrice, 72_000);
      assert.equal(result.requiresApproval, true);
    }
  });

  it("does not cap price increases", () => {
    const result = decideReprice({
      currentPrice: 50_000,
      targetPrice: 90_000,
      deadZoneWon: 500,
      bepPrice: 30_000,
      persistenceHours: 3,
    });
    assert.equal(result.action, "reprice");
    if (result.action === "reprice") {
      assert.equal(result.newPrice, 90_000);
      assert.equal(result.requiresApproval, false);
    }
  });
});

describe("evaluateSoonOutOfStockHold", () => {
  const now = new Date("2026-07-24T00:00:00.000Z");

  it("stays clear when nothing indicates a soon-out-of-stock competitor", () => {
    const result = evaluateSoonOutOfStockHold({
      now,
      currentHoldReason: null,
      currentHoldUntil: null,
      holdRecheckHours: 36,
      latestLog: { marketLowestPrice: 79_000, isSoonOutOfStock: false },
    });
    assert.deepEqual(result, { holdReason: null, holdUntil: null, changed: false });
  });

  it("enters hold when the latest check confirms a soon-out-of-stock lowest competitor", () => {
    const result = evaluateSoonOutOfStockHold({
      now,
      currentHoldReason: null,
      currentHoldUntil: null,
      holdRecheckHours: 36,
      latestLog: { marketLowestPrice: 70_000, isSoonOutOfStock: true },
    });
    assert.equal(result.holdReason, "competitor_soon_out_of_stock");
    assert.equal(result.changed, true);
    assert.equal(result.holdUntil, new Date(now.getTime() + 36 * 3_600_000).toISOString());
  });

  it("clears hold immediately once the competitor disappears (sold out)", () => {
    const result = evaluateSoonOutOfStockHold({
      now,
      currentHoldReason: "competitor_soon_out_of_stock",
      currentHoldUntil: new Date(now.getTime() + 10 * 3_600_000).toISOString(),
      holdRecheckHours: 36,
      latestLog: { marketLowestPrice: null, isSoonOutOfStock: false },
    });
    assert.deepEqual(result, { holdReason: null, holdUntil: null, changed: true });
  });

  it("clears hold immediately once restock is detected (flag cleared)", () => {
    const result = evaluateSoonOutOfStockHold({
      now,
      currentHoldReason: "competitor_soon_out_of_stock",
      currentHoldUntil: new Date(now.getTime() + 10 * 3_600_000).toISOString(),
      holdRecheckHours: 36,
      latestLog: { marketLowestPrice: 70_000, isSoonOutOfStock: false },
    });
    assert.deepEqual(result, { holdReason: null, holdUntil: null, changed: true });
  });

  it("extends the hold window when recheck is due but still confirmed", () => {
    const pastUntil = new Date(now.getTime() - 1000).toISOString();
    const result = evaluateSoonOutOfStockHold({
      now,
      currentHoldReason: "competitor_soon_out_of_stock",
      currentHoldUntil: pastUntil,
      holdRecheckHours: 36,
      latestLog: { marketLowestPrice: 70_000, isSoonOutOfStock: true },
    });
    assert.equal(result.holdReason, "competitor_soon_out_of_stock");
    assert.equal(result.changed, false);
    assert.equal(result.holdUntil, new Date(now.getTime() + 36 * 3_600_000).toISOString());
  });

  it("keeps the existing hold window when recheck is not yet due", () => {
    const futureUntil = new Date(now.getTime() + 10 * 3_600_000).toISOString();
    const result = evaluateSoonOutOfStockHold({
      now,
      currentHoldReason: "competitor_soon_out_of_stock",
      currentHoldUntil: futureUntil,
      holdRecheckHours: 36,
      latestLog: { marketLowestPrice: 70_000, isSoonOutOfStock: true },
    });
    assert.deepEqual(result, {
      holdReason: "competitor_soon_out_of_stock",
      holdUntil: futureUntil,
      changed: false,
    });
  });
});
