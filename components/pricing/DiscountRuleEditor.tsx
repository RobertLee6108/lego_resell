"use client";

import { formInputCompactClass } from "@/components/ui/formStyles";
import type { DiscountRuleInput, DiscountRuleType } from "@/lib/pricing/types";

interface DiscountRuleEditorProps {
  rules: DiscountRuleInput[];
  onChange: (rules: DiscountRuleInput[]) => void;
}

const RULE_GROUPS: { type: DiscountRuleType; title: string; field: "percent" | "fixed" }[] = [
  { type: "instant", title: "즉시 할인 %", field: "percent" },
  { type: "card_charge", title: "카드 청구할인 %", field: "percent" },
  { type: "cashback", title: "캐시백/적립 %", field: "percent" },
  { type: "other", title: "기타 정액 (원)", field: "fixed" },
];

function upsertRule(
  rules: DiscountRuleInput[],
  type: DiscountRuleType,
  value: number | null,
  field: "percent" | "fixed",
): DiscountRuleInput[] {
  const idx = rules.findIndex((r) => r.rule_type === type);
  const label =
    type === "instant"
      ? "즉시할인"
      : type === "card_charge"
        ? "카드 청구할인"
        : type === "cashback"
          ? "캐시백"
          : "기타 할인";

  if (value == null || value <= 0) {
    if (idx === -1) return rules;
    return rules.filter((_, i) => i !== idx);
  }

  const next: DiscountRuleInput = {
    rule_type: type,
    label,
    apply_order:
      type === "instant" ? 1 : type === "other" ? 1 : type === "card_charge" ? 2 : 3,
    is_active: true,
    percent: field === "percent" ? value : null,
    fixed_amount: field === "fixed" ? Math.round(value) : null,
  };

  if (idx === -1) return [...rules, next];
  const copy = [...rules];
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

function getValue(rules: DiscountRuleInput[], type: DiscountRuleType, field: "percent" | "fixed") {
  const rule = rules.find((r) => r.rule_type === type);
  if (!rule) return "";
  if (field === "percent") return rule.percent ?? "";
  return rule.fixed_amount ?? "";
}

export function DiscountRuleEditor({ rules, onChange }: DiscountRuleEditorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {RULE_GROUPS.map(({ type, title, field }) => (
        <label key={type} className="flex flex-col gap-1 text-xs">
          <span className="text-zinc-600">{title}</span>
          <input
            type="number"
            min={0}
            max={field === "percent" ? 100 : undefined}
            step={field === "percent" ? 0.1 : 100}
            value={getValue(rules, type, field)}
            onChange={(e) => {
              const raw = e.target.value;
              const num = raw === "" ? null : Number(raw);
              onChange(upsertRule(rules, type, num, field));
            }}
            className={formInputCompactClass}
            placeholder={field === "percent" ? "0" : "0"}
          />
        </label>
      ))}
    </div>
  );
}
