"use client";

import { useActionState, useMemo, useState } from "react";
import {
  actionSearchNaverShopping,
  type NaverShoppingActionState,
} from "@/app/naver-shopping/actions";
import { formInputClass, formSelectClass } from "@/components/ui/formStyles";
import { recommendedQueriesForProduct } from "@/lib/naver-shopping/suggestions";
import type { ProductSearchOption } from "@/lib/naver-shopping/types";
import { NaverShoppingResultsTable } from "./NaverShoppingResultsTable";

interface NaverShoppingSearchFormProps {
  products: ProductSearchOption[];
  savedKeywords: string[];
  isLoggedIn?: boolean;
}

const initialState: NaverShoppingActionState = { ok: false };

export function NaverShoppingSearchForm({
  products,
  savedKeywords,
  isLoggedIn = false,
}: NaverShoppingSearchFormProps) {
  const [state, action, pending] = useActionState(
    actionSearchNaverShopping,
    initialState,
  );
  const [queries, setQueries] = useState([""]);
  const [productNumber, setProductNumber] = useState("");

  const selectedProduct =
    products.find((p) => p.product_number === productNumber) ?? null;

  const recommended = useMemo(
    () =>
      [
        ...recommendedQueriesForProduct(selectedProduct),
        ...savedKeywords.slice(0, 6),
      ].filter((value, index, list) => list.indexOf(value) === index),
    [selectedProduct, savedKeywords],
  );

  function setQuery(index: number, value: string) {
    setQueries((prev) => prev.map((q, i) => (i === index ? value : q)));
  }

  function addQuery(value = "") {
    setQueries((prev) => (prev.length >= 5 ? prev : [...prev, value]));
  }

  function removeQuery(index: number) {
    setQueries((prev) =>
      prev.length === 1 ? [""] : prev.filter((_, i) => i !== index),
    );
  }

  function applyRecommendation(query: string) {
    const emptyIndex = queries.findIndex((q) => q.trim() === "");
    if (emptyIndex >= 0) {
      setQuery(emptyIndex, query);
      return;
    }
    addQuery(query);
  }

  return (
    <div className="space-y-4">
      <form action={action} className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            카탈로그 제품
            <select
              name="product_number"
              value={productNumber}
              onChange={(e) => setProductNumber(e.target.value)}
              className={formSelectClass}
            >
              <option value="">제품 선택 없음</option>
              {products.map((product) => (
                <option key={product.product_number} value={product.product_number}>
                  {product.product_number} · {product.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            API 정렬
            <select name="sort" defaultValue="sim" className={formSelectClass}>
              <option value="sim">정확도순</option>
              <option value="date">날짜순</option>
              <option value="asc">가격 낮은 순</option>
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

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-600">
              검색어 (1~5개)
            </span>
            <button
              type="button"
              onClick={() => addQuery()}
              disabled={queries.length >= 5}
              className="text-xs text-emerald-700 underline disabled:text-zinc-400"
            >
              + 검색어 추가
            </button>
          </div>

          {queries.map((query, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                name="queries"
                required={index === 0}
                value={query}
                onChange={(e) => setQuery(index, e.target.value)}
                placeholder="예: 레고 72046"
                className={`${formInputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeQuery(index)}
                className="rounded-lg border border-zinc-200 px-3 text-xs text-zinc-500 hover:bg-zinc-50"
              >
                삭제
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {recommended.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => applyRecommendation(query)}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
            >
              {query}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-600">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="exclude_used" defaultChecked />
            중고 제외
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="exclude_overseas" defaultChecked />
            해외직구/구매대행 제외
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="naverpay_only" />
            네이버페이만
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="include_shipping" />
            배송비 포함 보기
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "검색 중…" : "네이버 상품 검색"}
        </button>

        {state.error ? (
          <p className="mt-3 text-sm text-red-600">{state.error}</p>
        ) : null}
      </form>

      {state.ok && state.input && state.results ? (
        <NaverShoppingResultsTable
          input={state.input}
          results={state.results}
          canSave={isLoggedIn}
        />
      ) : null}
    </div>
  );
}
