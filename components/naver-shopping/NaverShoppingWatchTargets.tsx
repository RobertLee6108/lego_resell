"use client";

import { useMemo, useState } from "react";
import {
  actionAddNaverShoppingWatchTarget,
  actionDeleteNaverShoppingWatchTarget,
  actionToggleNaverShoppingWatchTarget,
} from "@/app/naver-shopping/actions";
import { formInputClass, formSelectClass } from "@/components/ui/formStyles";
import type {
  NaverShoppingWatchTarget,
  ProductSearchOption,
} from "@/lib/naver-shopping/types";

interface NaverShoppingWatchTargetsProps {
  products: ProductSearchOption[];
  targets: NaverShoppingWatchTarget[];
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NaverShoppingWatchTargets({
  products,
  targets,
}: NaverShoppingWatchTargetsProps) {
  const [productNumber, setProductNumber] = useState("");
  const selectedProduct = useMemo(
    () => products.find((p) => p.product_number === productNumber) ?? null,
    [products, productNumber],
  );
  const defaultKeyword = selectedProduct
    ? `레고 ${selectedProduct.product_number}`
    : "";

  return (
    <div className="space-y-3">
      <form
        action={actionAddNaverShoppingWatchTarget}
        className="rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h3 className="mb-4 text-base font-semibold text-zinc-800">
          관심 제품/키워드 추가
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            제품
            <select
              name="product_number"
              value={productNumber}
              onChange={(e) => setProductNumber(e.target.value)}
              className={formSelectClass}
            >
              <option value="">키워드만 추적</option>
              {products.map((product) => (
                <option key={product.product_number} value={product.product_number}>
                  {product.product_number} · {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            검색 키워드
            <input
              type="text"
              name="keyword"
              required
              defaultValue={defaultKeyword}
              key={defaultKeyword}
              placeholder="예: 레고 72046"
              className={formInputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            주기 (분)
            <input
              type="number"
              name="interval_minutes"
              min={15}
              defaultValue={60}
              className={formInputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            정렬
            <select name="sort" defaultValue="asc" className={formSelectClass}>
              <option value="asc">가격 낮은 순</option>
              <option value="sim">정확도순</option>
              <option value="date">날짜순</option>
              <option value="dsc">가격 높은 순</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            표시 개수
            <input
              type="number"
              name="display"
              min={1}
              max={100}
              defaultValue={20}
              className={formInputClass}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-600">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="include_used" />
            중고 포함
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="include_overseas" />
            해외직구/구매대행 포함
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="include_shipping" />
            배송비 포함 비교
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          관심 검색 추가
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">키워드</th>
              <th className="px-4 py-3 text-left font-medium">상태</th>
              <th className="px-4 py-3 text-right font-medium">주기</th>
              <th className="px-4 py-3 text-left font-medium">최근/다음 실행</th>
              <th className="px-4 py-3 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {targets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  아직 관심 검색이 없습니다.
                </td>
              </tr>
            ) : (
              targets.map((target) => (
                <tr key={target.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{target.keyword}</div>
                    <div className="font-mono text-xs text-zinc-500">
                      {target.product_number ?? "키워드"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {target.enabled ? (
                      <span className="text-emerald-700">활성</span>
                    ) : (
                      <span className="text-zinc-400">중지</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{target.interval_minutes}분</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    <div>최근 {formatDateTime(target.last_run_at)}</div>
                    <div>다음 {formatDateTime(target.next_run_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <form action={actionToggleNaverShoppingWatchTarget}>
                        <input type="hidden" name="id" value={target.id} />
                        <input
                          type="hidden"
                          name="enabled"
                          value={target.enabled ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                        >
                          {target.enabled ? "중지" : "재개"}
                        </button>
                      </form>
                      <form action={actionDeleteNaverShoppingWatchTarget}>
                        <input type="hidden" name="id" value={target.id} />
                        <button
                          type="submit"
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
