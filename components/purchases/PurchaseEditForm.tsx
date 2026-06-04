"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { actionUpdatePurchaseRecord } from "@/app/purchases/actions";
import { formInputClass, formSelectClass } from "@/components/ui/formStyles";
import type { PurchaseRecord } from "@/lib/purchases/types";
import type { RetailerOption } from "@/lib/retailers/types";

interface Product {
  product_number: string;
  name: string;
}

interface PurchaseEditFormProps {
  record: PurchaseRecord;
  products: Product[];
  retailers: RetailerOption[];
  onCancel: () => void;
}

export function PurchaseEditForm({
  record,
  products,
  retailers,
  onCancel,
}: PurchaseEditFormProps) {
  const router = useRouter();
  const [, action, pending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionUpdatePurchaseRecord(formData);
      onCancel();
      router.refresh();
      return null;
    },
    null,
  );

  return (
    <form
      action={action}
      className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4"
    >
      <input type="hidden" name="id" value={record.id} />
      <p className="mb-3 text-xs font-semibold text-emerald-800">구매 기록 수정</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          제품
          <select
            name="product_number"
            required
            defaultValue={record.product_number}
            className={formSelectClass}
          >
            {products.map((p) => (
              <option key={p.product_number} value={p.product_number}>
                {p.product_number} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          쇼핑몰
          <select
            name="retailer_id"
            defaultValue={record.retailer_id ?? ""}
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
            required
            defaultValue={record.purchased_at}
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          수량
          <input
            type="number"
            name="quantity"
            min={1}
            required
            defaultValue={record.quantity}
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          개당 매입가
          <input
            type="number"
            name="unit_cost"
            min={0}
            required
            defaultValue={record.unit_cost}
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          개당 실구매가
          <input
            type="number"
            name="effective_price_paid"
            min={0}
            defaultValue={record.effective_price_paid ?? ""}
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          소싱처 메모
          <input
            type="text"
            name="source_note"
            defaultValue={record.source_note ?? ""}
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          메모
          <input
            type="text"
            name="memo"
            defaultValue={record.memo ?? ""}
            className={formInputClass}
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
