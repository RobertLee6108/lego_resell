import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcCostVsMsrp, formatCostVsMsrpLabel } from "./formatCostVsMsrp";

describe("formatCostVsMsrp", () => {
  it("calcCostVsMsrp computes discount percent and amount", () => {
    const v = calcCostVsMsrp(69_900, 50_000);
    assert.ok(v);
    assert.equal(v.discountPct, 28.5);
    assert.equal(v.discountAmount, 19_900);
  });

  it("returns null discountPct when msrp is zero", () => {
    const v = calcCostVsMsrp(0, 50_000);
    assert.ok(v);
    assert.equal(v.discountPct, null);
    assert.equal(v.discountAmount, 0);
  });

  it("formatCostVsMsrpLabel includes key parts", () => {
    const v = calcCostVsMsrp(100_000, 72_300)!;
    const label = formatCostVsMsrpLabel(v);
    assert.match(label, /정가/);
    assert.match(label, /원가/);
    assert.match(label, /할인율 27\.7%/);
  });
});
