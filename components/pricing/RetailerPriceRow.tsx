"use client";

import { useState } from "react";
import { calculateEffectivePrice, savingsPercent } from "@/lib/pricing/calculateEffectivePrice";
import { formatKrw } from "@/lib/format";
import type { DiscountRuleInput, PriceBreakdown } from "@/lib/pricing/types";
import { DiscountRuleEditor } from "./DiscountRuleEditor";
import { EffectivePriceBreakdown } from "./EffectivePriceBreakdown";

export interface RetailerRowData {
  listing_id: string;
  retailer_name: string;
  retailer_slug: string;
  sale_price: number;
  shipping_fee: number;
  product_url: string | null;
  in_stock: boolean;
  rules: DiscountRuleInput[];
}

interface RetailerPriceRowProps {
  row: RetailerRowData;
  msrp: number;
  isLowest: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

export function RetailerPriceRow({
  row,
  msrp,
  isLowest,
  isSelected,
  onSelect,
}: RetailerPriceRowProps) {
  const [rules, setRules] = useState<DiscountRuleInput[]>(row.rules);
  const [open, setOpen] = useState(false);

  const { effective_price, breakdown } = calculateEffectivePrice(
    row.sale_price,
    row.shipping_fee,
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
          {!row.in_stock && (
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
          <span className="font-medium">{formatKrw(row.sale_price)}</span>
        </div>
        <div className="text-sm">
          <span className="text-zinc-500">배송 </span>
          <span>{formatKrw(row.shipping_fee)}</span>
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
          {open ? "할인 입력 닫기" : "할인 입력 열기"}
        </button>
        {open && (
          <div className="mb-3">
            <DiscountRuleEditor rules={rules} onChange={setRules} />
          </div>
        )}
        {isSelected && (
          <EffectivePriceBreakdown
            breakdown={breakdown as PriceBreakdown}
            retailerName={row.retailer_name}
          />
        )}
        {row.product_url && (
          <a
            href={row.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-emerald-700 underline"
          >
            몰에서 보기 →
          </a>
        )}
      </div>
    </div>
  );
}
