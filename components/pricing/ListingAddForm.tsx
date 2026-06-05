"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { actionAddListing } from "@/app/products/actions";
import {
  formInputClass,
  formSelectClass,
} from "@/components/ui/formStyles";
import type { RetailerOption } from "@/lib/retailers/types";

interface ListingAddFormProps {
  productNumber: string;
  retailers: RetailerOption[];
  existingRetailerIds: string[];
}

export function ListingAddForm({
  productNumber,
  retailers,
  existingRetailerIds,
}: ListingAddFormProps) {
  const router = useRouter();
  const available = retailers.filter((r) => !existingRetailerIds.includes(r.id));

  const [, action, pending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionAddListing(formData);
      router.refresh();
      return null;
    },
    null,
  );

  if (available.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        등록 가능한 쇼핑몰이 없습니다. 구매 페이지에서 쇼핑몰을 추가하세요.
      </p>
    );
  }

  return (
    <form
      action={action}
      className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5"
    >
      <input type="hidden" name="product_number" value={productNumber} />
      <h3 className="mb-4 text-base font-semibold text-zinc-800">몰 가격 추가</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          쇼핑몰
          <select name="retailer_id" required className={formSelectClass}>
            {available.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          판매가 (원)
          <input
            type="number"
            name="sale_price"
            min={0}
            required
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          배송비 (원)
          <input
            type="number"
            name="shipping_fee"
            min={0}
            defaultValue={0}
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          상품 URL
          <input
            type="url"
            name="product_url"
            placeholder="https://"
            className={formInputClass}
          />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
        <input type="checkbox" name="in_stock" value="on" defaultChecked />
        재고 있음
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "추가 중…" : "몰 가격 추가"}
      </button>
    </form>
  );
}
