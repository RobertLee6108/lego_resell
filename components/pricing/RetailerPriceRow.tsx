"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  actionDeleteListing,
  actionSaveListing,
} from "@/app/products/actions";
import { calculateEffectivePrice, savingsPercent } from "@/lib/pricing/calculateEffectivePrice";
import { formatKrw } from "@/lib/format";
import type { DiscountRuleInput, PriceBreakdown } from "@/lib/pricing/types";
import {
  formInputClass,
  formInputCompactClass,
} from "@/components/ui/formStyles";
import { DiscountRuleEditor } from "./DiscountRuleEditor";
import { EffectivePriceBreakdown } from "./EffectivePriceBreakdown";

export interface RetailerRowData {
  listing_id: string;
  retailer_id: string;
  retailer_name: string;
  retailer_slug: string;
  sale_price: number;
  shipping_fee: number;
  product_url: string | null;
  in_stock: boolean;
  rules: DiscountRuleInput[];
}

interface RetailerPriceRowProps {
  productNumber: string;
  row: RetailerRowData;
  msrp: number;
  isLowest: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

export function RetailerPriceRow({
  productNumber,
  row,
  msrp,
  isLowest,
  isSelected,
  onSelect,
}: RetailerPriceRowProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<DiscountRuleInput[]>(row.rules);
  const [salePrice, setSalePrice] = useState(row.sale_price);
  const [shippingFee, setShippingFee] = useState(row.shipping_fee);
  const [inStock, setInStock] = useState(row.in_stock);
  const [productUrl, setProductUrl] = useState(row.product_url ?? "");

  useEffect(() => {
    setRules(row.rules);
    setSalePrice(row.sale_price);
    setShippingFee(row.shipping_fee);
    setInStock(row.in_stock);
    setProductUrl(row.product_url ?? "");
  }, [row]);

  const [, saveAction, savePending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionSaveListing(formData);
      router.refresh();
      return null;
    },
    null,
  );

  const [, deleteAction, deletePending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionDeleteListing(formData);
      router.refresh();
      return null;
    },
    null,
  );

  const { effective_price, breakdown } = calculateEffectivePrice(
    salePrice,
    shippingFee,
    rules,
  );
  const vsMsrp = savingsPercent(msrp, effective_price);

  return (
    <div
      className={`rounded-xl border bg-white transition ${
        isLowest ? "border-emerald-400 ring-2 ring-emerald-500/30" : "border-zinc-200"
      } ${isSelected ? "ring-2 ring-zinc-400" : ""}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full flex-col gap-2 p-4 text-left sm:grid sm:grid-cols-[1fr_repeat(4,minmax(0,auto))] sm:items-center sm:gap-4"
      >
        <div>
          <span className="font-semibold text-zinc-900">{row.retailer_name}</span>
          {!inStock && (
            <span className="ml-2 text-xs text-red-600">품절</span>
          )}
          {isLowest && (
            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
              최저
            </span>
          )}
        </div>
        <div className="text-sm">
          <span className="text-zinc-500">판매가 </span>
          <span className="font-medium">{formatKrw(salePrice)}</span>
        </div>
        <div className="text-sm">
          <span className="text-zinc-500">배송 </span>
          <span>{formatKrw(shippingFee)}</span>
        </div>
        <div className="text-sm font-semibold text-emerald-700">
          {formatKrw(effective_price)}
        </div>
        <div className="text-sm text-zinc-600">
          {vsMsrp != null ? `정가의 ${vsMsrp}%` : "—"}
        </div>
      </button>

      <div className="border-t border-zinc-100 px-4 pb-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
        >
          {open ? "가격 수정 닫기" : "가격·할인 수정"}
        </button>
        {open && (
          <form action={saveAction} className="space-y-3">
            <input type="hidden" name="product_number" value={productNumber} />
            <input type="hidden" name="listing_id" value={row.listing_id} />
            <input
              type="hidden"
              name="rules_json"
              value={JSON.stringify(rules)}
            />
            <input type="hidden" name="in_stock" value={inStock ? "on" : "off"} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                판매가 (원)
                <input
                  type="number"
                  name="sale_price"
                  min={0}
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className={formInputCompactClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
                배송비 (원)
                <input
                  type="number"
                  name="shipping_fee"
                  min={0}
                  required
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Number(e.target.value))}
                  className={formInputCompactClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 sm:col-span-2">
                상품 URL
                <input
                  type="url"
                  name="product_url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://"
                  className={formInputClass}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
              />
              재고 있음
            </label>
            <DiscountRuleEditor rules={rules} onChange={setRules} />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={savePending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savePending ? "저장 중…" : "가격 저장"}
              </button>
            </div>
          </form>
        )}
        {isSelected && (
          <EffectivePriceBreakdown
            breakdown={breakdown as PriceBreakdown}
            retailerName={row.retailer_name}
          />
        )}
        {(productUrl || row.product_url) && (
          <a
            href={productUrl || row.product_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-emerald-700 underline"
          >
            몰에서 보기 →
          </a>
        )}
        <form action={deleteAction} className="mt-3">
          <input type="hidden" name="product_number" value={productNumber} />
          <input type="hidden" name="listing_id" value={row.listing_id} />
          <button
            type="submit"
            disabled={deletePending}
            className="text-xs text-red-500 hover:underline disabled:opacity-50"
          >
            {deletePending ? "삭제 중…" : "이 몰 리스팅 삭제"}
          </button>
        </form>
      </div>
    </div>
  );
}
