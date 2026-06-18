"use client";

import { useMemo, useState } from "react";
import { PageSection } from "@/components/layout/PageSection";
import { groupProductsByTheme } from "@/lib/catalog/groupProductsByTheme";
import { ProductCard, type ProductCardProps } from "./ProductCard";
import { ProductFilters } from "./ProductFilters";
import { ThemeManager } from "./ThemeManager";
import type { ProductStatus } from "@/lib/pricing/types";

interface CatalogGridProps {
  products: ProductCardProps[];
  themes: { value: string; label: string }[];
  initialThemeId?: string;
  initialStatus?: string;
}

export function CatalogGrid({
  products,
  themes,
  initialThemeId = "",
  initialStatus = "",
}: CatalogGridProps) {
  const [themeId, setThemeId] = useState(initialThemeId);
  const [status, setStatus] = useState(initialStatus);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (themeId && p.themeId !== themeId) return false;
      if (status && p.status !== (status as ProductStatus)) return false;
      return true;
    });
  }, [products, themeId, status]);

  const grouped = useMemo(
    () => groupProductsByTheme(filtered, themes),
    [filtered, themes],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <ProductFilters
          themes={themes}
          themeId={themeId}
          status={status}
          onThemeChange={setThemeId}
          onStatusChange={setStatus}
        />
        <ThemeManager themes={themes} />
      </div>
      {grouped.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">
          조건에 맞는 제품이 없습니다.
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <PageSection
              key={group.themeId ?? "uncategorized"}
              title={`${group.themeName} (${group.products.length})`}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.products.map((p) => (
                  <ProductCard
                    key={p.productNumber}
                    {...p}
                    hideThemeName
                  />
                ))}
              </div>
            </PageSection>
          ))}
        </div>
      )}
    </div>
  );
}
