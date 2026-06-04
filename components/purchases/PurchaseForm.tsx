"use client";

import { useActionState } from "react";
import { actionAddPurchaseRecord } from "@/app/purchases/actions";
import { formInputClass, formSelectClass } from "@/components/ui/formStyles";

interface Product {
  product_number: string;
  name: string;
}

interface Retailer {
  id: string;
  name: string;
}

interface PurchaseFormProps {
  products: Product[];
  retailers: Retailer[];
}

const today = new Date().toISOString().slice(0, 10);

export function PurchaseForm({ products, retailers }: PurchaseFormProps) {
  const [, action, pending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionAddPurchaseRecord(formData);
      return null;
    },
    null,
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-zinc-200 bg-white p-5"
    >
      <h3 className="mb-4 text-base font-semibold text-zinc-800">구매 기록 추가</h3>
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
          구매 쇼핑몰
          <select
            name="retailer_id"
            className={formSelectClass}
          >
            <option value="">직접입력 / 기타</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          구매일
          <input
            type="date"
            name="purchased_at"
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
          개당 매입가 (원)
          <input
            type="number"
            name="unit_cost"
            min={0}
            required
            placeholder="예: 145000"
            className={formInputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          개당 실구매가 (원, 선택)
          <input
            type="number"
            name="effective_price_paid"
            min={0}
            placeholder="할인 적용 후 체감가"
            className={formInputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          소싱처 메모
          <input
            type="text"
            name="source_note"
            placeholder="예: 쿠팡 직구, 해외직구"
            className={formInputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
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
        className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "저장 중…" : "추가"}
      </button>
    </form>
  );
}
