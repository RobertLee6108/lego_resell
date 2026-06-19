import type { ProductSearchOption } from "@/lib/naver-shopping/types";

const STOPWORDS = new Set(["레고", "lego", "및", "the", "and", "with"]);

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function recommendedQueriesForProduct(
  product: ProductSearchOption | null,
): string[] {
  if (!product) return ["레고", "레고 세트", "레고 신제품"];

  const name = product.name.trim();
  const productNumber = product.product_number.trim();
  const withoutLego = name.replace(/레고[®™]?\s*/gi, "").trim();

  return unique([
    productNumber,
    `레고 ${productNumber}`,
    `${productNumber} ${withoutLego || name}`,
    `레고 ${withoutLego || name}`,
  ]).slice(0, 6);
}

export function recommendedQueriesFromTitles(titles: string[]): string[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const token of title.split(/[\s,/|()[\]{}·:+-]+/)) {
      const cleaned = token.trim().toLowerCase();
      if (cleaned.length < 2 || STOPWORDS.has(cleaned)) continue;
      counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, 8)
    .map(([token]) => token);
}

export function mergeRecommendedQueries(
  productQueries: string[],
  savedKeywords: string[],
  titleQueries: string[],
): string[] {
  return unique([...productQueries, ...savedKeywords, ...titleQueries]).slice(0, 12);
}
