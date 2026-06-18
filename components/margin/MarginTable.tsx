"use client";

import { useMemo, useState } from "react";
import { formatKrw } from "@/lib/format";
import {
  defaultSortDirectionForKey,
  sortMarginRows,
  type MarginSortKey,
  type SortDirection,
} from "@/lib/margin/sortMarginRows";
import type { MarginSummary } from "@/lib/margin/types";

interface MarginTableProps {
  rows: MarginSummary[];
}

const COLUMNS: {
  key: MarginSortKey;
  label: string;
  align: "left" | "right";
}[] = [
  { key: "product", label: "제품", align: "left" },
  { key: "total_sold", label: "판매 수량", align: "right" },
  { key: "total_revenue", label: "총 수익", align: "right" },
  { key: "total_cost_basis", label: "원가", align: "right" },
  { key: "total_platform_fee", label: "수수료", align: "right" },
  { key: "total_shipping_out", label: "발송비", align: "right" },
  { key: "net_profit", label: "순이익", align: "right" },
  { key: "roi_pct", label: "ROI", align: "right" },
];

function roiColor(roi: number | null): string {
  if (roi == null) return "text-zinc-400";
  if (roi >= 20) return "text-emerald-700 font-bold";
  if (roi >= 10) return "text-emerald-600";
  if (roi >= 0) return "text-zinc-700";
  return "text-red-600 font-bold";
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  return (
    <span
      className={`ml-1 inline-block w-3 ${active ? "text-zinc-700" : "text-zinc-300"}`}
      aria-hidden
    >
      {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export function MarginTable({ rows }: MarginTableProps) {
  const [sortKey, setSortKey] = useState<MarginSortKey>("net_profit");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const sortedRows = useMemo(
    () => sortMarginRows(rows, sortKey, sortDirection),
    [rows, sortKey, sortDirection],
  );

  function handleSort(key: MarginSortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(defaultSortDirectionForKey(key));
  }

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
            {COLUMNS.map((col) => {
              const active = sortKey === col.key;
              const ariaSort = active
                ? sortDirection === "asc"
                  ? "ascending"
                  : "descending"
                : "none";

              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium ${
                    col.align === "left" ? "text-left" : "text-right"
                  }`}
                  aria-sort={ariaSort}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className={`inline-flex w-full cursor-pointer items-center transition hover:text-zinc-900 ${
                      col.align === "left" ? "justify-start" : "justify-end"
                    } ${active ? "text-zinc-900" : ""}`}
                  >
                    {col.label}
                    <SortIndicator active={active} direction={sortDirection} />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sortedRows.map((row) => {
            const isProfit = row.net_profit >= 0;
            return (
              <tr key={row.product_number} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-900">{row.name}</div>
                  <div className="font-mono text-xs text-zinc-500">
                    {row.product_number}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">{row.total_sold}개</td>
                <td className="px-4 py-3 text-right">
                  {formatKrw(row.total_revenue)}
                </td>
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
