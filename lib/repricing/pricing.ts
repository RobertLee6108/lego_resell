import type { RepricingRule } from "@/lib/repricing/types";

/** 목표가 = max(카탈로그최저가 - 100원, BEP + 최소마진액, 하드플로어) */
export function calculateTargetPrice(
  rule: Pick<RepricingRule, "min_margin_won" | "bep_price" | "floor_price">,
  marketLowestPrice: number,
): number {
  const catalogBased = marketLowestPrice - 100;
  const marginFloor = rule.bep_price + rule.min_margin_won;
  let target = Math.max(catalogBased, marginFloor);
  if (rule.floor_price != null) {
    target = Math.max(target, rule.floor_price);
  }
  return target;
}
