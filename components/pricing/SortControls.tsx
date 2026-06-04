"use client";

import { formSelectClass } from "@/components/ui/formStyles";

export type SortKey = "effective" | "sale" | "msrp_ratio";

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: "effective", label: "체감가 낮은 순" },
  { value: "sale", label: "판매가 낮은 순" },
  { value: "msrp_ratio", label: "정가 대비 %" },
];

interface SortControlsProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
}

export function SortControls({ value, onChange }: SortControlsProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      className={formSelectClass}
      aria-label="정렬"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
