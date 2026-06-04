import { formatKrw } from "@/lib/format";
import type { MarginTotals } from "@/lib/margin/types";

interface MarginSummaryCardsProps {
  totals: MarginTotals;
}

export function MarginSummaryCards({ totals }: MarginSummaryCardsProps) {
  const isProfit = totals.net_profit >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <dt className="text-xs font-medium text-zinc-500">총 판매수익</dt>
        <dd className="mt-1 text-xl font-bold text-zinc-900">
          {formatKrw(totals.total_revenue)}
        </dd>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <dt className="text-xs font-medium text-zinc-500">총 원가</dt>
        <dd className="mt-1 text-xl font-bold text-zinc-700">
          −{formatKrw(totals.total_cost_basis)}
        </dd>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <dt className="text-xs font-medium text-zinc-500">수수료 합계</dt>
        <dd className="mt-1 text-xl font-bold text-red-600">
          −{formatKrw(totals.total_platform_fee)}
        </dd>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <dt className="text-xs font-medium text-zinc-500">발송비 합계</dt>
        <dd className="mt-1 text-xl font-bold text-red-600">
          −{formatKrw(totals.total_shipping_out)}
        </dd>
      </div>
      <div
        className={`rounded-xl border p-4 ${
          isProfit
            ? "border-emerald-300 bg-emerald-50"
            : "border-red-300 bg-red-50"
        }`}
      >
        <dt className="text-xs font-medium text-zinc-600">
          순이익{" "}
          {totals.roi_pct != null && (
            <span
              className={`ml-1 font-semibold ${isProfit ? "text-emerald-700" : "text-red-600"}`}
            >
              (ROI {totals.roi_pct > 0 ? "+" : ""}
              {totals.roi_pct}%)
            </span>
          )}
        </dt>
        <dd
          className={`mt-1 text-2xl font-bold ${
            isProfit ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {isProfit ? "+" : ""}
          {formatKrw(totals.net_profit)}
        </dd>
      </div>
    </div>
  );
}
