"use client";

import { useId, useMemo, useState } from "react";
import { formInputClass } from "@/components/ui/formStyles";
import { formatKrw } from "@/lib/format";
import { filterInventoryProductsByQuery } from "@/lib/margin/filterInventoryProducts";
import type { InventorySummary } from "@/lib/inventory/types";
import {
  calcCostVsMsrp,
  formatCostVsMsrpLabel,
} from "@/lib/margin/formatCostVsMsrp";

interface InventoryProductPickerProps {
  products: InventorySummary[];
  value: string;
  onChange: (productNumber: string, avgCost: number | null) => void;
  onEditCost?: () => void;
}

export function InventoryProductPicker({
  products,
  value,
  onChange,
  onEditCost,
}: InventoryProductPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();

  const filtered = useMemo(
    () => filterInventoryProductsByQuery(products, query),
    [products, query],
  );

  const showSuggestions = open && query.trim().length > 0;

  const selected = products.find((p) => p.product_number === value) ?? null;
  const selectedVsMsrp =
    selected?.avg_cost != null
      ? calcCostVsMsrp(selected.msrp, selected.avg_cost)
      : null;

  function handleSelect(row: InventorySummary) {
    onChange(row.product_number, row.avg_cost ?? null);
    setQuery("");
    setOpen(false);
  }

  return (
    <div
      className={`flex flex-col gap-2 sm:col-span-2 lg:col-span-3 ${
        showSuggestions ? "relative z-30" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-600">
          재고 제품 (평균 원가 자동 입력)
        </span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("", null)}
            className="text-xs text-zinc-500 underline hover:text-zinc-800"
          >
            직접 입력
          </button>
        ) : null}
      </div>

      <div className="relative">
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder="제품번호·이름 검색…"
          className={`${formInputClass} w-full`}
          aria-label="재고 제품 검색"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={listId}
          aria-autocomplete="list"
        />

        {showSuggestions ? (
          <div
            id={listId}
            className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg"
            role="listbox"
            aria-label="재고 제품 자동완성"
          >
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-zinc-500">
                검색 결과가 없습니다.
              </p>
            ) : (
              filtered.map((row) => {
                const isSelected = row.product_number === value;
                const vsMsrp =
                  row.avg_cost != null
                    ? calcCostVsMsrp(row.msrp, row.avg_cost)
                    : null;

                return (
                  <button
                    key={row.product_number}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(row)}
                    className={`block w-full border-b border-zinc-100 px-3 py-2.5 text-left transition last:border-b-0 ${
                      isSelected
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-zinc-500">
                          {row.product_number}
                        </span>
                        <span className="text-zinc-400"> · </span>
                        <span className="text-sm font-medium text-zinc-900">
                          {row.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-500">
                        재고 {row.current_stock}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className="text-zinc-600">
                        정가 {formatKrw(row.msrp)}
                      </span>
                      <span className="text-zinc-400">→</span>
                      <span className="font-medium text-zinc-800">
                        원가{" "}
                        {row.avg_cost != null ? formatKrw(row.avg_cost) : "—"}
                      </span>
                      {vsMsrp?.discountPct != null ? (
                        <>
                          <span className="font-medium text-emerald-700">
                            할인율 {vsMsrp.discountPct}%
                          </span>
                          {vsMsrp.discountAmount > 0 ? (
                            <span className="text-zinc-500">
                              (−{formatKrw(vsMsrp.discountAmount)})
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-zinc-400">정가 대비 —</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {selected && selectedVsMsrp ? (
        <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-medium text-zinc-800">선택됨</span>{" "}
              {selected.product_number} · {selected.name}
            </span>
            {onEditCost ? (
              <button
                type="button"
                onClick={onEditCost}
                className="shrink-0 text-zinc-500 underline hover:text-zinc-800"
              >
                원가 수정
              </button>
            ) : null}
          </div>
          <p className="mt-1">{formatCostVsMsrpLabel(selectedVsMsrp)}</p>
        </div>
      ) : null}
    </div>
  );
}
