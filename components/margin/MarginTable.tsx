import { formatKrw } from "@/lib/format";
import type { MarginSummary } from "@/lib/margin/types";

interface MarginTableProps {
  rows: MarginSummary[];
}

function roiColor(roi: number | null): string {
  if (roi == null) return "text-zinc-400";
  if (roi >= 20) return "text-emerald-700 font-bold";
  if (roi >= 10) return "text-emerald-600";
  if (roi >= 0) return "text-zinc-700";
  return "text-red-600 font-bold";
}

export function MarginTable({ rows }: MarginTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
        마진 데이터가 없습니다. 소싱·판매 기록을 먼저 추가하세요.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[700px] text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">제품</th>
            <th className="px-4 py-3 text-right font-medium">판매 수량</th>
            <th className="px-4 py-3 text-right font-medium">총 수익</th>
            <th className="px-4 py-3 text-right font-medium">원가</th>
            <th className="px-4 py-3 text-right font-medium">수수료</th>
            <th className="px-4 py-3 text-right font-medium">발송비</th>
            <th className="px-4 py-3 text-right font-medium">순이익</th>
            <th className="px-4 py-3 text-right font-medium">ROI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row) => {
            const isProfit = row.net_profit >= 0;
            return (
              <tr key={row.product_number} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">{row.name}</div>
                  <div className="font-mono text-xs text-zinc-500">{row.product_number}</div>
                </td>
                <td className="px-4 py-3 text-right">{row.total_sold}개</td>
                <td className="px-4 py-3 text-right">{formatKrw(row.total_revenue)}</td>
                <td className="px-4 py-3 text-right text-zinc-600">
                  −{formatKrw(row.total_cost_basis)}
                </td>
                <td className="px-4 py-3 text-right text-red-500">
                  {row.total_platform_fee > 0
                    ? `−${formatKrw(row.total_platform_fee)}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-red-500">
                  {row.total_shipping_out > 0
                    ? `−${formatKrw(row.total_shipping_out)}`
                    : "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    isProfit ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {isProfit ? "+" : ""}
                  {formatKrw(row.net_profit)}
                </td>
                <td className={`px-4 py-3 text-right ${roiColor(row.roi_pct)}`}>
                  {row.roi_pct != null
                    ? `${row.roi_pct > 0 ? "+" : ""}${row.roi_pct}%`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
