"use client";

import { useActionState } from "react";
import { actionAddSalesRecord } from "@/app/sales/actions";
import { formInputClass, formSelectClass } from "@/components/ui/formStyles";

interface Product {
  product_number: string;
  name: string;
}

interface Retailer {
  id: string;
  name: string;
}

interface SalesFormProps {
  products: Product[];
  retailers: Retailer[];
}

const today = new Date().toISOString().slice(0, 10);

export function SalesForm({ products, retailers }: SalesFormProps) {
  const [, action, pending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionAddSalesRecord(formData);
      return null;
    },
    null,
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-zinc-200 bg-white p-5"
    >
      <h3 className="mb-4 text-base font-semibold text-zinc-800">판매 기록 추가</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          제품
          <select
            name="product_number"
            required
            className={formSelectClass}
          >
            <option value="">선택</option>
            {products.map((p) => (
              <option key={p.product_number} value={p.product_number}>
                {p.product_number} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          판매 채널 (쇼핑몰)
          <select
            name="retailer_id"
            className={formSelectClass}
          >
            <option value="">직접 판매 / 기타</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          판매일
          <input
            type="date"
            name="sold_at"
            defaultValue={today}
            required
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          수량
          <input
            type="number"
            name="quantity"
            min={1}
            defaultValue={1}
            required
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          개당 판매가 (원)
          <input
            type="number"
            name="unit_sale_price"
            min={0}
            required
            placeholder="예: 180000"
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          수수료율 (%)
          <input
            type="number"
            name="platform_fee_rate"
            min={0}
            max={100}
            step={0.1}
            defaultValue={0}
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          발송비 (원)
          <input
            type="number"
            name="shipping_out_cost"
            min={0}
            defaultValue={0}
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 sm:col-span-2 lg:col-span-2">
          메모
          <input
            type="text"
            name="memo"
            placeholder="(선택)"
            className={formInputClass}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "저장 중…" : "추가"}
      </button>
    </form>
  );
}
