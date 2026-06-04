import type { Database } from "@/types/database";
import type { DiscountRuleInput } from "@/lib/pricing/types";

type RuleRow = Database["public"]["Tables"]["listing_discount_rules"]["Row"];

export function mapDiscountRule(row: RuleRow): DiscountRuleInput {
  return {
    rule_type: row.rule_type,
    label: row.label,
    percent: row.percent != null ? Number(row.percent) : null,
    fixed_amount: row.fixed_amount,
    apply_order: row.apply_order,
    is_active: row.is_active,
  };
}
