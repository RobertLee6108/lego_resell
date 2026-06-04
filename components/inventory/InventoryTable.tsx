"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { formatKrw } from "@/lib/format";
import type { InventorySummary } from "@/lib/inventory/types";
import type { PurchaseRecord } from "@/lib/purchases/types";
import type { RetailerOption } from "@/lib/retailers/types";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { PurchaseHistoryTable } from "@/components/purchases/PurchaseHistoryTable";
import type { ProductStatus } from "@/lib/pricing/types";
import {
  TablePager,
  paginateSlice,
  type PageSizeOption,
} from "@/components/ui/TablePager";

interface Product {
  product_number: string;
  name: string;
}

interface InventoryTableProps {
  rows: InventorySummary[];
  purchaseRecords: PurchaseRecord[];
  products: Product[];
  retailers: RetailerOption[];
}

export function InventoryTable({
  rows,
  purchaseRecords,
  products,
  retailers,
}: InventoryTableProps) {
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [page, setPage] = useState(1);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const recordsByProduct = useMemo(() => {
    const map = new Map<string, PurchaseRecord[]>();
    for (const r of purchaseRecords) {
      const list = map.get(r.product_number) ?? [];
      list.push(r);
      map.set(r.product_number, list);
    }
    return map;
  }, [purchaseRecords]);

  const paged = useMemo(
    () => paginateSlice(rows, page, pageSize),
    [rows, page, pageSize],
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
        재고가 없습니다.{" "}
        <Link href="/purchases" className="text-emerald-700 underline">
          구매 이력
        </Link>
        에서 첫 매입을 추가하세요.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <TablePager
        total={rows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th className="w-8 px-2 py-3" aria-label="펼치기" />
              <th className="px-4 py-3 text-left font-medium">제품</th>
              <th className="px-4 py-3 text-right font-medium">정가</th>
              <th className="px-4 py-3 text-right font-medium">평균 매입가</th>
              <th className="px-4 py-3 text-right font-medium">총 매입</th>
              <th className="px-4 py-3 text-right font-medium">판매</th>
              <th className="px-4 py-3 text-right font-medium">재고</th>
              <th className="px-4 py-3 text-right font-medium">재고 평가액</th>
              <th className="px-4 py-3 text-center font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {paged.map((row) => {
              const isExpanded = expandedProduct === row.product_number;
              const productPurchases =
                recordsByProduct.get(row.product_number) ?? [];

              return (
                <Fragment key={row.product_number}>
                  <tr
                    className={`hover:bg-zinc-50 ${isExpanded ? "bg-zinc-50/80" : ""}`}
                  >
                    <td className="px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedProduct(
                            isExpanded ? null : row.product_number,
                          )
                        }
                        className="text-xs text-zinc-500 hover:text-zinc-800"
                        aria-expanded={isExpanded}
                        title="매입 이력 보기·수정"
                      >
                        {isExpanded ? "▾" : "▸"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{row.name}</div>
                      <div className="font-mono text-xs text-zinc-500">
                        {row.product_number}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {formatKrw(row.msrp)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {row.avg_cost != null ? formatKrw(row.avg_cost) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.total_sourced}개
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {row.total_sold}개
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        row.current_stock > 0
                          ? "text-emerald-700"
                          : "text-zinc-400"
                      }`}
                    >
                      {row.current_stock}개
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {formatKrw(row.stock_value)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ProductStatusBadge
                        status={row.status as ProductStatus}
                      />
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="bg-zinc-50/50 px-4 py-4">
                        <p className="mb-2 text-xs font-medium text-zinc-600">
                          {row.product_number} 매입 이력 — 수정 시 재고·마진이
                          갱신됩니다
                        </p>
                        <PurchaseHistoryTable
                          records={productPurchases}
                          products={products}
                          retailers={retailers}
                          allowEdit
                          allowDelete={false}
                          hideProductColumn
                          showPager={productPurchases.length > 5}
                        />
                        <p className="mt-2 text-xs text-zinc-400">
                          추가·삭제는{" "}
                          <Link
                            href="/purchases"
                            className="text-emerald-700 underline"
                          >
                            구매 이력
                          </Link>
                          에서 하세요.
                        </p>
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
