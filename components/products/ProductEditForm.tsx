"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { actionUpdateProduct } from "@/app/products/actions";
import {
  formInputClass,
  formInputMonoClass,
  formSelectClass,
} from "@/components/ui/formStyles";
import type { ProductStatus } from "@/lib/pricing/types";
import type { ThemeOption } from "./ThemeManager";

interface ProductEditFormProps {
  productNumber: string;
  name: string;
  msrp: number;
  status: ProductStatus;
  themeId: string | null;
  releaseDate: string | null;
  themes: ThemeOption[];
}

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "on_sale", label: "발매중" },
  { value: "retiring_soon", label: "단종예정" },
  { value: "discontinued", label: "단종" },
];

export function ProductEditForm({
  productNumber,
  name,
  msrp,
  status,
  themeId,
  releaseDate,
  themes,
}: ProductEditFormProps) {
  const router = useRouter();
  const [, action, pending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionUpdateProduct(formData);
      router.refresh();
      return null;
    },
    null,
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-amber-200 bg-amber-50/60 p-5"
    >
      <input type="hidden" name="product_number" value={productNumber} />
      <h3 className="mb-1 text-base font-semibold text-zinc-800">제품 정보 수정</h3>
      <p className="mb-4 text-xs text-zinc-600">
        정가·제품명 등을 잘못 입력했을 때 여기서 수정하세요.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          품번
          <input
            type="text"
            value={productNumber}
            readOnly
            className={`${formInputMonoClass} bg-zinc-100 text-zinc-500`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          제품명
          <input
            type="text"
            name="name"
            required
            defaultValue={name}
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
            defaultValue={msrp}
            className={formInputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          테마
          <select
            name="theme_id"
            defaultValue={themeId ?? ""}
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
            defaultValue={status}
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
            defaultValue={releaseDate ?? ""}
            className={formInputClass}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {pending ? "저장 중…" : "제품 정보 저장"}
      </button>
    </form>
  );
}
