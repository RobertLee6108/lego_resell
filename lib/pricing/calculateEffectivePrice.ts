import type {
  DiscountRuleInput,
  EffectivePriceResult,
  PriceBreakdown,
} from "./types";

function isActive(rule: DiscountRuleInput): boolean {
  return rule.is_active !== false;
}

function sortedRules(
  rules: DiscountRuleInput[],
  filter: (r: DiscountRuleInput) => boolean,
): DiscountRuleInput[] {
  return [...rules]
    .filter((r) => isActive(r) && filter(r))
    .sort((a, b) => a.apply_order - b.apply_order || a.label.localeCompare(b.label));
}

/**
 * 체감 실구매가 — DB `calculate_effective_price`와 동일 순서:
 * 1. subtotal = sale + shipping
 * 2. instant/other: 정액 → 비율 (apply_order)
 * 3. card_charge: 남은 금액에 %
 * 4. cashback: 결제 예상액에 % → 체감가 차감
 */
export function calculateEffectivePrice(
  salePrice: number,
  shippingFee: number,
  rules: DiscountRuleInput[],
): EffectivePriceResult {
  const steps: PriceBreakdown["steps"] = [];
  const subtotal = salePrice + shippingFee;
  let amount = subtotal;

  steps.push({
    step: "subtotal",
    label: "판매가+배송",
    amount: Math.round(subtotal),
  });

  for (const rule of sortedRules(
    rules,
    (r) =>
      (r.rule_type === "instant" || r.rule_type === "other") &&
      r.fixed_amount != null &&
      r.fixed_amount > 0,
  )) {
    const deduction = rule.fixed_amount!;
    amount -= deduction;
    steps.push({
      step: "deduction_fixed",
      rule_type: rule.rule_type,
      label: rule.label,
      deduction: Math.round(deduction),
      remaining: Math.round(Math.max(amount, 0)),
    });
  }

  for (const rule of sortedRules(
    rules,
    (r) =>
      (r.rule_type === "instant" || r.rule_type === "other") &&
      r.percent != null &&
      r.percent > 0,
  )) {
    const deduction = amount * (rule.percent! / 100);
    amount -= deduction;
    steps.push({
      step: "deduction_percent",
      rule_type: rule.rule_type,
      label: rule.label,
      percent: rule.percent!,
      deduction: Math.round(deduction),
      remaining: Math.round(Math.max(amount, 0)),
    });
  }

  for (const rule of sortedRules(
    rules,
    (r) => r.rule_type === "card_charge" && r.percent != null && r.percent > 0,
  )) {
    const deduction = amount * (rule.percent! / 100);
    amount -= deduction;
    steps.push({
      step: "card_charge",
      label: rule.label,
      percent: rule.percent!,
      deduction: Math.round(deduction),
      remaining: Math.round(Math.max(amount, 0)),
    });
  }

  const paymentBeforeCashback = Math.max(amount, 0);
  steps.push({
    step: "payment_before_cashback",
    label: "결제 예상액",
    amount: Math.round(paymentBeforeCashback),
  });

  let cashbackTotal = 0;
  for (const rule of sortedRules(
    rules,
    (r) => r.rule_type === "cashback" && r.percent != null && r.percent > 0,
  )) {
    const deduction = paymentBeforeCashback * (rule.percent! / 100);
    cashbackTotal += deduction;
    steps.push({
      step: "cashback",
      label: rule.label,
      percent: rule.percent!,
      deduction: Math.round(deduction),
    });
  }

  amount = Math.max(paymentBeforeCashback - cashbackTotal, 0);
  steps.push({
    step: "effective_price",
    label: "체감 실구매가",
    amount: Math.round(amount),
  });

  return {
    effective_price: Math.round(amount),
    breakdown: { steps },
  };
}

export function savingsPercent(msrp: number, effectivePrice: number): number | null {
  if (msrp <= 0) return null;
  return Math.round((effectivePrice / msrp) * 1000) / 10;
}
