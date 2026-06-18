"use client";

import Link from "next/link";
import { actionDeleteProduct } from "@/app/actions";
import { formatKrw } from "@/lib/format";
import type { ProductStatus } from "@/lib/pricing/types";
import { ProductStatusBadge } from "./ProductStatusBadge";

export interface ProductCardProps {
  productNumber: string;
  name: string;
  msrp: number;
  status: ProductStatus;
  themeId: string | null;
  themeName: string | null;
  lowestEffectivePrice: number | null;
  listingCount: number;
  hideThemeName?: boolean;
}

export function ProductCard({
  productNumber,
  name,
  msrp,
  status,
  themeName,
  lowestEffectivePrice,
  listingCount,
  hideThemeName = false,
}: ProductCardProps) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
      <form
        action={actionDeleteProduct}
        className="absolute right-3 top-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <input type="hidden" name="product_number" value={productNumber} />
        <button
          type="submit"
          className="rounded px-1.5 py-0.5 text-xs text-red-500 opacity-0 transition hover:bg-red-50 group-hover:opacity-100"
          title="제품 삭제"
        >
          삭제
        </button>
      </form>
      <Link
        href={`/products/${productNumber}`}
        className="flex flex-1 flex-col"
      >
      <div className="mb-2 flex items-start justify-between gap-2 pr-10">
        <span className="font-mono text-xs text-zinc-500">{productNumber}</span>
        <ProductStatusBadge status={status} />
      </div>
      <h2 className="mb-1 text-base font-semibold text-zinc-900 group-hover:text-emerald-800">
        {name}
      </h2>
      {themeName && !hideThemeName && (
        <p className="mb-3 text-xs text-zinc-500">{themeName}</p>
      )}
      <dl className="mt-auto grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-zinc-500">정가</dt>
          <dd className="font-medium">{formatKrw(msrp)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">최저 체감가</dt>
          <dd className="font-semibold text-emerald-700">
            {lowestEffectivePrice != null
              ? formatKrw(lowestEffectivePrice)
              : "—"}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-zinc-400">{listingCount}개 몰 비교</p>
      </Link>
    </div>
  );
}
