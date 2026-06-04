"use client";

import { Fragment, useMemo, useState } from "react";
import { actionDeletePurchaseRecord } from "@/app/purchases/actions";
import { formatKrw, formatDate } from "@/lib/format";
import type { PurchaseRecord } from "@/lib/purchases/types";
import type { RetailerOption } from "@/lib/retailers/types";
import {
  TablePager,
  paginateSlice,
  type PageSizeOption,
} from "@/components/ui/TablePager";
import { PurchaseEditForm } from "./PurchaseEditForm";

interface Product {
  product_number: string;
  name: string;
}

interface PurchaseHistoryTableProps {
  records: PurchaseRecord[];
  products: Product[];
  retailers: RetailerOption[];
  /** 구매 이력 탭: 삭제만. 재고 펼침: 수정만 */
  allowEdit?: boolean;
  allowDelete?: boolean;
  hideProductColumn?: boolean;
  showPager?: boolean;
}

export function PurchaseHistoryTable({
  records,
  products,
  retailers,
  allowEdit = true,
  allowDelete = true,
  hideProductColumn = false,
  showPager = true,
}: PurchaseHistoryTableProps) {
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const paged = useMemo(
    () => paginateSlice(records, page, pageSize),
    [records, page, pageSize],
  );

  if (records.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xs text-zinc-500">
        이 품번의 구매 기록이 없습니다.
      </p>
    );
  }

  const colCount =
    (hideProductColumn ? 0 : 1) + 6 + 1 + (allowEdit || allowDelete ? 1 : 0);

  return (
    <div className="space-y-3">
      {showPager && (
        <TablePager
          total={records.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
            <tr>
              {!hideProductColumn && (
                <th className="px-4 py-3 text-left font-medium">제품</th>
              )}
              <th className="px-4 py-3 text-left font-medium">쇼핑몰</th>
              <th className="px-4 py-3 text-left font-medium">구매일</th>
              <th className="px-4 py-3 text-right font-medium">수량</th>
              <th className="px-4 py-3 text-right font-medium">개당 매입가</th>
              <th className="px-4 py-3 text-right font-medium">개당 실구매가</th>
              <th className="px-4 py-3 text-right font-medium">총 실구매액</th>
              <th className="px-4 py-3 text-left font-medium">메모</th>
              {(allowEdit || allowDelete) && (
                <th className="px-4 py-3 text-right font-medium">작업</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {paged.map((r) => {
              const hasEffective =
                r.effective_price_paid !== null &&
                r.effective_price_paid !== r.unit_cost;
              const isEditing = editingId === r.id;

              return (
                <Fragment key={r.id}>
                  <tr className="hover:bg-zinc-50">
                    {!hideProductColumn && (
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.product_name}</div>
                        <div className="font-mono text-xs text-zinc-500">
                          {r.product_number}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-zinc-600">
                      {r.retailer_name ?? r.source_note ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatDate(r.purchased_at)}
                    </td>
                    <td className="px-4 py-3 text-right">{r.quantity}개</td>
                    <td className="px-4 py-3 text-right text-zinc-500">
                      {formatKrw(r.unit_cost)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.effective_price_paid !== null ? (
                        <span
                          className={
                            hasEffective ? "font-medium text-emerald-700" : ""
                          }
                        >
                          {formatKrw(r.effective_price_paid)}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatKrw(r.total_effective_cost)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {r.memo ?? r.source_note ?? "—"}
                    </td>
                    {(allowEdit || allowDelete) && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {allowEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingId(isEditing ? null : r.id)
                              }
                              className="text-xs text-zinc-600 hover:underline"
                            >
                              {isEditing ? "닫기" : "수정"}
                            </button>
                          )}
                          {allowDelete && (
                            <form action={actionDeletePurchaseRecord}>
                              <input type="hidden" name="id" value={r.id} />
                              <button
                                type="submit"
                                className="text-xs text-red-500 hover:underline"
                              >
                                삭제
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {allowEdit && isEditing && (
                    <tr>
                      <td colSpan={colCount} className="px-4 py-3">
                        <PurchaseEditForm
                          record={r}
                          products={products}
                          retailers={retailers}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
