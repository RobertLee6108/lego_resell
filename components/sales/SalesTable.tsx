import { formatKrw, formatDate } from "@/lib/format";
import type { SalesRecord } from "@/lib/sales/types";
import { calcSaleNetRevenue } from "@/lib/sales/types";
import { actionDeleteSalesRecord } from "@/app/sales/actions";

interface SalesTableProps {
  records: SalesRecord[];
}

export function SalesTable({ records }: SalesTableProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
        판매 기록이 없습니다. 위 폼에서 첫 판매를 추가하세요.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">제품</th>
            <th className="px-4 py-3 text-left font-medium">채널</th>
            <th className="px-4 py-3 text-left font-medium">판매일</th>
            <th className="px-4 py-3 text-right font-medium">수량</th>
            <th className="px-4 py-3 text-right font-medium">판매가</th>
            <th className="px-4 py-3 text-right font-medium">수수료</th>
            <th className="px-4 py-3 text-right font-medium">발송비</th>
            <th className="px-4 py-3 text-right font-medium">실수령</th>
            <th className="px-4 py-3 text-left font-medium">메모</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {records.map((r) => {
            const revenue = r.unit_sale_price * r.quantity;
            const fee = Math.round(revenue * r.platform_fee_rate / 100);
            const net = calcSaleNetRevenue(
              r.unit_sale_price,
              r.quantity,
              r.platform_fee_rate,
              r.shipping_out_cost,
            );
            return (
              <tr key={r.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.product_name ?? r.product_number}</div>
                  <div className="font-mono text-xs text-zinc-500">{r.product_number}</div>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {r.retailer_name ?? "직접"}
                </td>
                <td className="px-4 py-3 text-zinc-600">{formatDate(r.sold_at)}</td>
                <td className="px-4 py-3 text-right">{r.quantity}개</td>
                <td className="px-4 py-3 text-right">{formatKrw(revenue)}</td>
                <td className="px-4 py-3 text-right text-red-600">
                  −{formatKrw(fee)}
                  {r.platform_fee_rate > 0 && (
                    <span className="ml-1 text-xs text-zinc-400">
                      ({r.platform_fee_rate}%)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-red-600">
                  {r.shipping_out_cost > 0 ? `−${formatKrw(r.shipping_out_cost)}` : "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-blue-700">
                  {formatKrw(net)}
                </td>
                <td className="px-4 py-3 text-zinc-500">{r.memo ?? "—"}</td>
                <td className="px-4 py-3">
                  <form action={actionDeleteSalesRecord}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="text-xs text-red-500 hover:underline">
                      삭제
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
