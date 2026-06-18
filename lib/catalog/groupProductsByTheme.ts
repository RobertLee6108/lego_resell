import type { ProductCardProps } from "@/components/products/ProductCard";

export interface ThemeProductGroup {
  themeId: string | null;
  themeName: string;
  products: ProductCardProps[];
}

const UNCATEGORIZED_LABEL = "미분류";

export function groupProductsByTheme(
  products: ProductCardProps[],
  themes: { value: string; label: string }[],
): ThemeProductGroup[] {
  const themeIdSet = new Set(themes.map((t) => t.value));
  const buckets = new Map<string | null, ProductCardProps[]>();

  for (const theme of themes) {
    buckets.set(theme.value, []);
  }
  buckets.set(null, []);

  for (const product of products) {
    const key =
      product.themeId && themeIdSet.has(product.themeId)
        ? product.themeId
        : null;
    const list = buckets.get(key) ?? buckets.get(null)!;
    list.push(product);
  }

  const groups: ThemeProductGroup[] = [];

  for (const theme of themes) {
    const items = buckets.get(theme.value) ?? [];
    if (items.length === 0) continue;
    groups.push({
      themeId: theme.value,
      themeName: theme.label,
      products: items,
    });
  }

  const uncategorized = buckets.get(null) ?? [];
  if (uncategorized.length > 0) {
    groups.push({
      themeId: null,
      themeName: UNCATEGORIZED_LABEL,
      products: uncategorized,
    });
  }

  return groups;
}
