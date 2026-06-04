"use client";

import type { ProductStatus } from "@/lib/pricing/types";
import { formSelectClass } from "@/components/ui/formStyles";

export interface FilterOption {
  value: string;
  label: string;
}

interface ProductFiltersProps {
  themes: FilterOption[];
  themeId: string;
  status: string;
  onThemeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체 상태" },
  { value: "on_sale", label: "발매중" },
  { value: "retiring_soon", label: "단종예정" },
  { value: "discontinued", label: "단종" },
];

export function ProductFilters({
  themes,
  themeId,
  status,
  onThemeChange,
  onStatusChange,
}: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={themeId}
        onChange={(e) => onThemeChange(e.target.value)}
        className={formSelectClass}
        aria-label="테마 필터"
      >
        <option value="">전체 테마</option>
        {themes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className={formSelectClass}
        aria-label="상태 필터"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export type { ProductStatus };
