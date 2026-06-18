"use client";

import { useMemo, useState } from "react";
import { formInputClass, formSelectClass } from "@/components/ui/formStyles";
import { formatKrw } from "@/lib/format";
import {
  recommendPriceByMarginRate,
  recommendPriceByTargetProfit,
} from "@/lib/margin/calculateRecommendedPrice";
import type { InventorySummary } from "@/lib/inventory/types";

type CalcMode = "margin_rate" | "target_profit";

const PLATFORM_PRESETS = [
  { label: "직접 판매", rate: 0 },
  { label: "당근마켓", rate: 0 },
  { label: "번개장터", rate: 6 },
  { label: "중고나라", rate: 0 },
  { label: "크몽", rate: 20 },
] as const;

interface RecommendedPriceCalculatorProps {
  inventoryRows: InventorySummary[];
}

function parseNonNegativeInt(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function RecommendedPriceCalculator({
  inventoryRows,
}: RecommendedPriceCalculatorProps) {
  const [mode, setMode] = useState<CalcMode>("margin_rate");
  const [productNumber, setProductNumber] = useState("");
  const [unitCostInput, setUnitCostInput] = useState("");
  const [marginRateInput, setMarginRateInput] = useState("30");
  const [targetProfitInput, setTargetProfitInput] = useState("");
  const [platformFeeInput, setPlatformFeeInput] = useState("0");
  const [shippingInput, setShippingInput] = useState("0");

  const stockProducts = inventoryRows.filter(
    (r) => r.current_stock > 0 && r.avg_cost != null && r.avg_cost > 0,
  );

  const unitCost = parseNonNegativeInt(unitCostInput);
  const platformFeeRate = parseNonNegativeInt(platformFeeInput);
  const shippingOut = parseNonNegativeInt(shippingInput) ?? 0;
  const marginRate = parseNonNegativeInt(marginRateInput);
  const targetProfit = parseNonNegativeInt(targetProfitInput);

  const result = useMemo(() => {
    if (unitCost == null || unitCost <= 0 || platformFeeRate == null) return null;
    if (platformFeeRate >= 100) return null;

    if (mode === "margin_rate") {
      if (marginRate == null) return null;
      return recommendPriceByMarginRate(
        unitCost,
        marginRate,
        platformFeeRate,
        shippingOut,
      );
    }

    if (targetProfit == null) return null;
    return recommendPriceByTargetProfit(
      unitCost,
      targetProfit,
      platformFeeRate,
      shippingOut,
    );
  }, [unitCost, platformFeeRate, shippingOut, mode, marginRate, targetProfit]);

  function handleProductChange(value: string) {
    setProductNumber(value);
    if (!value) return;
    const row = stockProducts.find((r) => r.product_number === value);
    if (row?.avg_cost != null) {
      setUnitCostInput(String(row.avg_cost));
    }
  }

  function applyPlatformPreset(rate: number) {
    setPlatformFeeInput(String(rate));
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-800">권장 판매가 계산</h3>
          <p className="mt-1 text-xs text-zinc-500">
            플랫폼 수수료·발송비를 반영한 개당 권장 판매가를 계산합니다.
          </p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-0.5">
          <button
            type="button"
            onClick={() => setMode("margin_rate")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              mode === "margin_rate"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            마진율(%)
          </button>
          <button
            type="button"
            onClick={() => setMode("target_profit")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              mode === "target_profit"
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            목표이익(원)
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          재고 제품 (평균 원가 자동 입력)
          <select
            value={productNumber}
            onChange={(e) => handleProductChange(e.target.value)}
            className={formSelectClass}
          >
            <option value="">직접 입력</option>
            {stockProducts.map((r) => (
              <option key={r.product_number} value={r.product_number}>
                {r.product_number} · {r.name} (원가 {formatKrw(r.avg_cost!)})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          매입 원가 (원)
          <input
            type="number"
            min={0}
            value={unitCostInput}
            onChange={(e) => setUnitCostInput(e.target.value)}
            placeholder="예: 120000"
            className={formInputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          플랫폼 수수료율 (%)
          <input
            type="number"
            min={0}
            max={99.9}
            step={0.1}
            value={platformFeeInput}
            onChange={(e) => setPlatformFeeInput(e.target.value)}
            className={formInputClass}
          />
        </label>

        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
          <span className="text-xs font-medium text-zinc-600">플랫폼 프리셋</span>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPlatformPreset(p.rate)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                {p.label}
                {p.rate > 0 ? ` ${p.rate}%` : ""}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          발송비 (원)
          <input
            type="number"
            min={0}
            value={shippingInput}
            onChange={(e) => setShippingInput(e.target.value)}
            className={formInputClass}
          />
        </label>

        {mode === "margin_rate" ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            목표 마진율 — 원가 대비 ROI (%)
            <input
              type="number"
              min={0}
              step={0.1}
              value={marginRateInput}
              onChange={(e) => setMarginRateInput(e.target.value)}
              placeholder="예: 30"
              className={formInputClass}
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            목표 순이익 (원)
            <input
              type="number"
              min={0}
              value={targetProfitInput}
              onChange={(e) => setTargetProfitInput(e.target.value)}
              placeholder="예: 50000"
              className={formInputClass}
            />
          </label>
        )}
      </div>

      <div className="mt-5 rounded-lg bg-zinc-50 p-4">
        {!result ? (
          <p className="text-sm text-zinc-500">
            {platformFeeRate != null && platformFeeRate >= 100
              ? "수수료율은 100% 미만이어야 합니다."
              : "원가와 목표값을 입력하면 권장 판매가가 표시됩니다."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm text-zinc-600">권장 판매가</span>
              <span className="text-2xl font-bold text-emerald-700">
                {formatKrw(result.recommended_price)}
              </span>
              <span className="text-xs text-zinc-500">(개당)</span>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-zinc-500">플랫폼 수수료</dt>
                <dd className="font-medium text-zinc-800">
                  −{formatKrw(result.platform_fee)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">발송비</dt>
                <dd className="font-medium text-zinc-800">
                  −{formatKrw(result.shipping_out_cost)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">매입 원가</dt>
                <dd className="font-medium text-zinc-800">
                  −{formatKrw(result.unit_cost)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">예상 순이익</dt>
                <dd
                  className={`font-medium ${
                    result.net_profit >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {result.net_profit >= 0 ? "+" : ""}
                  {formatKrw(result.net_profit)}
                  {result.roi_pct != null && (
                    <span className="ml-1 text-xs text-zinc-500">
                      (ROI {result.roi_pct}%)
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-zinc-500">
              수수료 반영 실수령 {formatKrw(result.net_after_fees)} → 원가 차감 후 순이익{" "}
              {formatKrw(result.net_profit)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
