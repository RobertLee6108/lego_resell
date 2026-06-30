import type {
  NaverShoppingApiItem,
  NaverShoppingApiResponse,
  NaverShoppingItem,
  NaverShoppingSearchResult,
} from "@/lib/naver-shopping/types";

function parsePrice(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function cleanText(value: string): string {
  return value
    .replace(/<\/?b>/gi, "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function emptyToNull(value: string): string | null {
  const cleaned = cleanText(value);
  return cleaned ? cleaned : null;
}

// 상품명에 이 키워드가 포함되면 비정품(액세서리·호환품) 의심
const SUSPICIOUS_TITLE_KEYWORDS = ["LED", "조명", "호환", "키트"];

function isSuspiciousItem(item: {
  brand: string | null;
  category2: string | null;
  title: string;
}): boolean {
  if (!item.brand || !item.category2) return true;
  return SUSPICIOUS_TITLE_KEYWORDS.some((kw) =>
    item.title.toLowerCase().includes(kw.toLowerCase()),
  );
}

export function normalizeNaverShoppingItem(
  item: NaverShoppingApiItem,
  query: string,
  productNumber: string | null,
): NaverShoppingItem {
  const lprice = parsePrice(item.lprice);
  const shippingFeeOverride = null;

  const brand = emptyToNull(item.brand);
  const category2 = emptyToNull(item.category2);
  const title = cleanText(item.title);

  return {
    query,
    productNumber,
    title,
    link: item.link,
    image: item.image || null,
    mallName: cleanText(item.mallName || "네이버"),
    lprice,
    hprice: parsePrice(item.hprice),
    productId: String(item.productId),
    productType: parsePrice(item.productType),
    maker: emptyToNull(item.maker),
    brand,
    category1: emptyToNull(item.category1),
    category2,
    category3: emptyToNull(item.category3),
    category4: emptyToNull(item.category4),
    shippingFeeOverride,
    effectivePrice: lprice,
    suspicious: isSuspiciousItem({ brand, category2, title }),
    raw: item,
  };
}

export function normalizeNaverShoppingResponse(
  response: NaverShoppingApiResponse,
  query: string,
  productNumber: string | null = null,
): NaverShoppingSearchResult {
  return {
    query,
    total: response.total,
    start: response.start,
    display: response.display,
    items: response.items.map((item) =>
      normalizeNaverShoppingItem(item, query, productNumber),
    ),
  };
}

export function effectivePriceWithShipping(
  item: Pick<NaverShoppingItem, "lprice" | "shippingFeeOverride">,
): number {
  return item.lprice + (item.shippingFeeOverride ?? 0);
}
