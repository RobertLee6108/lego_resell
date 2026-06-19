"use client";

import { useMemo, useState, useTransition } from "react";
import { actionSaveNaverShoppingResults } from "@/app/naver-shopping/actions";
import { formInputCompactClass, formSelectClass } from "@/components/ui/formStyles";
import { formatKrw } from "@/lib/format";
import { lowestNaverShoppingItem, sortNaverShoppingItems, withShippingPrice } from "@/lib/naver-shopping/sort";
import type {
  NaverShoppingClientSort,
  NaverShoppingSearchInput,
  NaverShoppingSearchResult,
} from "@/lib/naver-shopping/types";

interface NaverShoppingResultsTableProps {
  input: NaverShoppingSearchInput;
  results: NaverShoppingSearchResult[];
  canSave?: boolean;
}

function flatten(results: NaverShoppingSearchResult[]) {
  return results.flatMap((result) => result.items);
}

export function NaverShoppingResultsTable({
  input,
  results,
  canSave = false,
}: NaverShoppingResultsTableProps) {
  const [includeShipping, setIncludeShipping] = useState(input.includeShipping);
  const [clientSort, setClientSort] = useState<NaverShoppingClientSort>("api");
  const [shippingByProductId, setShippingByProductId] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const adjustedResults = useMemo(
    () =>
      results.map((result) => ({
        ...result,
        items: result.items.map((item) => {
          const value = shippingByProductId[item.productId];
          const parsed = value == null || value === "" ? null : Number(value);
          const shippingFeeOverride =
            parsed != null && Number.isFinite(parsed) && parsed >= 0
              ? Math.round(parsed)
              : null;
          return {
            ...item,
            shippingFeeOverride,
            effectivePrice: item.lprice + (shippingFeeOverride ?? 0),
          };
        }),
      })),
    [results, shippingByProductId],
  );

  const rows = useMemo(
    () => sortNaverShoppingItems(flatten(adjustedResults), clientSort),
    [adjustedResults, clientSort],
  );
  const lowest = lowestNaverShoppingItem(rows, includeShipping);

  function saveResults() {
    setMessage(null);
    startTransition(async () => {
      const state = await actionSaveNaverShoppingResults(
        { ...input, includeShipping },
        adjustedResults,
      );
      setMessage(
        state.ok
          ? "검색 결과를 저장했습니다."
          : state.error ?? "검색 결과 저장에 실패했습니다.",
      );
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
        검색 결과가 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={includeShipping}
              onChange={(e) => setIncludeShipping(e.target.checked)}
            />
            배송비 포함 가격 보기
          </label>
          <select
            value={clientSort}
            onChange={(e) => setClientSort(e.target.value as NaverShoppingClientSort)}
            className={formSelectClass}
            aria-label="검색 결과 정렬"
          >
            <option value="api">API 정렬 유지</option>
            <option value="effective_asc">배송비 포함가 낮은 순</option>
            <option value="effective_desc">배송비 포함가 높은 순</option>
            <option value="mall">몰명순</option>
            <option value="brand">브랜드순</option>
          </select>
        </div>
        {canSave ? (
          <button
            type="button"
            onClick={saveResults}
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isPending ? "저장 중…" : "검색 결과 저장"}
          </button>
        ) : null}
      </div>

      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">상품</th>
              <th className="px-4 py-3 text-left font-medium">몰</th>
              <th className="px-4 py-3 text-right font-medium">최저가</th>
              <th className="px-4 py-3 text-right font-medium">배송비 보정</th>
              <th className="px-4 py-3 text-right font-medium">비교가</th>
              <th className="px-4 py-3 text-left font-medium">브랜드/카테고리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((item) => {
              const comparePrice = includeShipping ? withShippingPrice(item) : item.lprice;
              const isLowest = lowest?.productId === item.productId;
              return (
                <tr
                  key={`${item.query}-${item.productId}`}
                  className={isLowest ? "bg-emerald-50/60" : "hover:bg-zinc-50"}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">{item.title}</span>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>검색어: {item.query}</span>
                      <span>ID {item.productId}</span>
                      {isLowest ? (
                        <span className="font-medium text-emerald-700">최저</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{item.mallName}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatKrw(item.lprice)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={shippingByProductId[item.productId] ?? ""}
                      onChange={(e) =>
                        setShippingByProductId((prev) => ({
                          ...prev,
                          [item.productId]: e.target.value,
                        }))
                      }
                      placeholder="미확인"
                      className={`${formInputCompactClass} w-24 text-right`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {formatKrw(comparePrice)}
                    {includeShipping && item.shippingFeeOverride == null ? (
                      <div className="text-xs font-normal text-zinc-400">배송비 미확인</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    <div>{item.brand ?? item.maker ?? "—"}</div>
                    <div>
                      {[item.category1, item.category2, item.category3, item.category4]
                        .filter(Boolean)
                        .join(" > ") || "—"}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
