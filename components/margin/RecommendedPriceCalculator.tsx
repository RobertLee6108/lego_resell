"use client";

import { useMemo, useState, useTransition } from "react";
import { formInputClass } from "@/components/ui/formStyles";
import { InventoryProductPicker } from "@/components/margin/InventoryProductPicker";
import { formatKrw } from "@/lib/format";
import { recommendPriceByTargetProfit } from "@/lib/margin/calculateRecommendedPrice";
import type { InventorySummary } from "@/lib/inventory/types";
import {
  actionFetchNaverMarketData,
  type NaverMarketData,
} from "@/app/margin/actions";

const PLATFORM_PRESETS = [
  { label: "직접 판매", rate: 0 },
  { label: "네이버 스마트스토어", rate: 6 },
] as const;

interface RecommendedPriceCalculatorProps {
  inventoryRows: InventorySummary[];
}

function parseNonNegativeInt(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseNonNegativeNumber(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function profitFromRoi(unitCost: number, roiPct: number): number {
  return Math.round((unitCost * roiPct) / 100);
}

function roiFromProfit(unitCost: number, profit: number): number {
  return Math.round((profit / unitCost) * 1000) / 10;
}

export function RecommendedPriceCalculator({
  inventoryRows,
}: RecommendedPriceCalculatorProps) {
  const [productNumber, setProductNumber] = useState("");
  const [unitCostInput, setUnitCostInput] = useState("");
  const [marginRoiInput, setMarginRoiInput] = useState("10");
  const [marginAmountInput, setMarginAmountInput] = useState("");
  const [platformFeeInput, setPlatformFeeInput] = useState("0");
  const [shippingInput, setShippingInput] = useState("0");
  const [editingUnitCost, setEditingUnitCost] = useState(false);

  const [naverData, setNaverData] = useState<NaverMarketData | null>(null);
  const [naverError, setNaverError] = useState<string | null>(null);
  const [isPendingNaver, startNaverTransition] = useTransition();

  const stockProducts = inventoryRows.filter(
    (r) => r.avg_cost != null && r.avg_cost > 0,
  );

  const unitCost = parseNonNegativeInt(unitCostInput);
  const platformFeeRate = parseNonNegativeNumber(platformFeeInput);
  const shippingOut = parseNonNegativeInt(shippingInput) ?? 0;
  const marginRoi = parseNonNegativeNumber(marginRoiInput);
  const marginAmount = parseNonNegativeInt(marginAmountInput);

  const targetProfit = useMemo(() => {
    if (marginAmount != null) return marginAmount;
    if (unitCost != null && unitCost > 0 && marginRoi != null) {
      return profitFromRoi(unitCost, marginRoi);
    }
    return null;
  }, [marginAmount, unitCost, marginRoi]);

  const result = useMemo(() => {
    if (unitCost == null || unitCost <= 0 || platformFeeRate == null) return null;
    if (platformFeeRate >= 100 || targetProfit == null) return null;

    return recommendPriceByTargetProfit(
      unitCost,
      targetProfit,
      platformFeeRate,
      shippingOut,
    );
  }, [unitCost, platformFeeRate, shippingOut, targetProfit]);

  const showUnitCostInput = !productNumber || editingUnitCost;

  function syncAmountFromRoi(cost: number, roiStr: string) {
    const roi = parseNonNegativeNumber(roiStr);
    if (roi != null) {
      setMarginAmountInput(String(profitFromRoi(cost, roi)));
    }
  }

  function handleRoiChange(value: string) {
    setMarginRoiInput(value);
    if (unitCost != null && unitCost > 0) {
      const roi = parseNonNegativeNumber(value);
      if (roi != null) {
        setMarginAmountInput(String(profitFromRoi(unitCost, roi)));
      }
    }
  }

  function handleAmountChange(value: string) {
    setMarginAmountInput(value);
    if (unitCost != null && unitCost > 0) {
      const amount = parseNonNegativeInt(value);
      if (amount != null) {
        setMarginRoiInput(String(roiFromProfit(unitCost, amount)));
      }
    }
  }

  function handleProductPick(productNum: string, avgCost: number | null) {
    setProductNumber(productNum);
    setNaverData(null);
    setNaverError(null);
    if (productNum && avgCost != null) {
      setUnitCostInput(String(avgCost));
      setEditingUnitCost(false);
      syncAmountFromRoi(avgCost, marginRoiInput);
    } else {
      setEditingUnitCost(true);
    }
  }

  function fetchNaverData() {
    setNaverError(null);
    startNaverTransition(async () => {
      const res = await actionFetchNaverMarketData(productNumber);
      if (res.ok) {
        setNaverData(res.data);
      } else {
        setNaverError(res.error);
      }
    });
  }

  function handleUnitCostChange(value: string) {
    setUnitCostInput(value);
    const cost = parseNonNegativeInt(value);
    if (cost != null && cost > 0) {
      if (marginAmountInput.trim() !== "") {
        const amount = parseNonNegativeInt(marginAmountInput);
        if (amount != null) {
          setMarginRoiInput(String(roiFromProfit(cost, amount)));
        }
      } else {
        syncAmountFromRoi(cost, marginRoiInput);
      }
    }
  }

  function applyPlatformPreset(rate: number) {
    setPlatformFeeInput(String(rate));
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-zinc-800">권장 판매가 계산</h3>
        <p className="mt-1 text-xs text-zinc-500">
          플랫폼 수수료·발송비를 반영한 개당 권장 판매가를 계산합니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InventoryProductPicker
          products={stockProducts}
          value={productNumber}
          onChange={handleProductPick}
          onEditCost={() => setEditingUnitCost(true)}
        />

        {showUnitCostInput ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            매입 원가 (원)
            <input
              type="number"
              min={0}
              value={unitCostInput}
              onChange={(e) => handleUnitCostChange(e.target.value)}
              placeholder="예: 120000"
              className={formInputClass}
            />
          </label>
        ) : null}

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

        <div className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-medium text-zinc-600">목표 마진</span>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              ROI — 원가 대비 (%)
              <input
                type="number"
                min={0}
                step={0.1}
                value={marginRoiInput}
                onChange={(e) => handleRoiChange(e.target.value)}
                placeholder="예: 10"
                className={formInputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              금액 (원)
              <input
                type="number"
                min={0}
                value={marginAmountInput}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="예: 12000"
                className={formInputClass}
              />
            </label>
          </div>
        </div>
      </div>
      {productNumber ? (
        <div className="mt-4 border-t border-zinc-100 pt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchNaverData}
              disabled={isPendingNaver}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
            >
              {isPendingNaver ? "조회 중…" : "네이버 시세 조회"}
            </button>
            {naverData && !isPendingNaver ? (
              <span className="text-xs text-zinc-400">
                정품 {naverData.competitorCount}건 기준
                {naverData.suspiciousCount > 0
                  ? ` · 비정품 의심 ${naverData.suspiciousCount}건 제외`
                  : ""}
              </span>
            ) : null}
          </div>

          {naverError && !isPendingNaver ? (
            <p className="mt-2 text-xs text-red-600">{naverError}</p>
          ) : null}

          {naverData && !isPendingNaver ? (
            <dl className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <dt className="text-xs text-zinc-500">카탈로그 최저가</dt>
                <dd className="mt-1 text-base font-semibold text-emerald-700">
                  {formatKrw(naverData.catalogLowestPrice)}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <dt className="text-xs text-zinc-500">경쟁셀러 수</dt>
                <dd className="mt-1 text-base font-semibold text-zinc-800">
                  {naverData.competitorCount}개
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <dt className="text-xs text-zinc-500">평균판매가</dt>
                <dd className="mt-1 text-base font-semibold text-blue-700">
                  {formatKrw(naverData.avgSellingPrice)}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}

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
