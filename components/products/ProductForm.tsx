"use client";

import { useActionState } from "react";
import { actionAddProduct } from "@/app/actions";
import {
  formInputClass,
  formInputMonoClass,
  formSelectClass,
} from "@/components/ui/formStyles";
import type { ProductStatus } from "@/lib/pricing/types";
import type { ThemeOption } from "./ThemeManager";

interface ProductFormProps {
  themes: ThemeOption[];
}

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "on_sale", label: "발매중" },
  { value: "retiring_soon", label: "단종예정" },
  { value: "discontinued", label: "단종" },
];

export function ProductForm({ themes }: ProductFormProps) {
  const [, action, pending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionAddProduct(formData);
      return null;
    },
    null,
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-zinc-200 bg-white p-5"
    >
      <h3 className="mb-4 text-base font-semibold text-zinc-800">제품 추가</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          품번
          <input
            type="text"
            name="product_number"
            required
            placeholder="예: 10316"
            className={formInputMonoClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          제품명
          <input
            type="text"
            name="name"
            required
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          정가 (원)
          <input
            type="number"
            name="msrp"
            min={0}
            required
            placeholder="169900"
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          테마
          <select
            name="theme_id"
            className={formSelectClass}
          >
            <option value="">없음</option>
            {themes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          상태
          <select
            name="status"
            defaultValue="on_sale"
            className={formSelectClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          출시일
          <input
            type="date"
            name="release_date"
            className={formInputClass}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "저장 중…" : "제품 추가"}
      </button>
    </form>
  );
}
