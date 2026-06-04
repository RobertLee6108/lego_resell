"use client";

import { useMemo, useState } from "react";
import { calculateEffectivePrice } from "@/lib/pricing/calculateEffectivePrice";
import { formatDate, formatKrw } from "@/lib/format";
import type { DiscountRuleInput, ProductStatus } from "@/lib/pricing/types";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { SortControls, type SortKey } from "./SortControls";
import { RetailerPriceRow, type RetailerRowData } from "./RetailerPriceRow";

export interface PriceComparisonDashboardProps {
  productNumber: string;
  name: string;
  msrp: number;
  status: ProductStatus;
  releaseDate: string | null;
  themeName: string | null;
  listings: RetailerRowData[];
}

export function PriceComparisonDashboard({
  productNumber,
  name,
  msrp,
  status,
  releaseDate,
  themeName,
  listings,
}: PriceComparisonDashboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>("effective");
  const [selectedId, setSelectedId] = useState<string | null>(
    listings[0]?.listing_id ?? null,
  );

  const sorted = useMemo(() => {
    const withEffective = listings.map((row) => ({
      row,
      effective: calculateEffectivePrice(
        row.sale_price,
        row.shipping_fee,
        row.rules,
      ).effective_price,
    }));

    return [...withEffective].sort((a, b) => {
      if (sortKey === "effective") return a.effective - b.effective;
      if (sortKey === "sale") return a.row.sale_price - b.row.sale_price;
      const ratioA = msrp > 0 ? a.effective / msrp : 0;
      const ratioB = msrp > 0 ? b.effective / msrp : 0;
      return ratioA - ratioB;
    });
  }, [listings, sortKey, msrp]);

  const lowestId = sorted[0]?.row.listing_id ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-2 border-b border-zinc-200 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-zinc-500">{productNumber}</span>
          <ProductStatusBadge status={status} />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">{name}</h1>
        <dl className="flex flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-zinc-500">정가 (MSRP)</dt>
            <dd className="text-lg font-semibold">{formatKrw(msrp)}</dd>
          </div>
          {themeName && (
            <div>
              <dt className="text-zinc-500">테마</dt>
              <dd>{themeName}</dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-500">출시일</dt>
            <dd>{formatDate(releaseDate)}</dd>
          </div>
        </dl>
      </header>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">몰별 가격 비교</h2>
        <SortControls value={sortKey} onChange={setSortKey} />
      </div>

      <div className="space-y-3">
        {sorted.map(({ row }) => (
          <RetailerPriceRow
            key={row.listing_id}
            row={row}
            msrp={msrp}
            isLowest={row.listing_id === lowestId}
            isSelected={selectedId === row.listing_id}
            onSelect={() => setSelectedId(row.listing_id)}
          />
        ))}
        {sorted.length === 0 && (
          <p className="text-sm text-zinc-500">등록된 리스팅이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
