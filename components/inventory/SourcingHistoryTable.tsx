import { formatKrw, formatDate } from "@/lib/format";
import type { SourcingRecord } from "@/lib/inventory/types";
import { actionDeleteSourcingRecord } from "@/app/inventory/actions";

interface SourcingHistoryTableProps {
  records: SourcingRecord[];
}

export function SourcingHistoryTable({ records }: SourcingHistoryTableProps) {
  if (records.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full min-w-[540px] text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">제품</th>
            <th className="px-4 py-3 text-left font-medium">구매일</th>
            <th className="px-4 py-3 text-right font-medium">수량</th>
            <th className="px-4 py-3 text-right font-medium">개당 매입가</th>
            <th className="px-4 py-3 text-right font-medium">합계</th>
            <th className="px-4 py-3 text-left font-medium">소싱처</th>
            <th className="px-4 py-3 text-left font-medium">메모</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-zinc-50">
              <td className="px-4 py-3">
                <div className="font-medium">{r.product_name ?? r.product_number}</div>
                <div className="font-mono text-xs text-zinc-500">{r.product_number}</div>
              </td>
              <td className="px-4 py-3 text-zinc-600">{formatDate(r.purchased_at)}</td>
              <td className="px-4 py-3 text-right">{r.quantity}개</td>
              <td className="px-4 py-3 text-right">{formatKrw(r.unit_cost)}</td>
              <td className="px-4 py-3 text-right font-medium">
                {formatKrw(r.unit_cost * r.quantity)}
              </td>
              <td className="px-4 py-3 text-zinc-600">{r.source_note ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-500">{r.memo ?? "—"}</td>
              <td className="px-4 py-3">
                <form action={actionDeleteSourcingRecord}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
