import type {
  NaverShoppingClientSort,
  NaverShoppingItem,
} from "@/lib/naver-shopping/types";

export function withShippingPrice(item: NaverShoppingItem): number {
  return item.lprice + (item.shippingFeeOverride ?? 0);
}

export function sortNaverShoppingItems(
  items: NaverShoppingItem[],
  sort: NaverShoppingClientSort,
): NaverShoppingItem[] {
  if (sort === "api") return items;

  return [...items].sort((a, b) => {
    if (sort === "effective_asc") {
      return withShippingPrice(a) - withShippingPrice(b);
    }
    if (sort === "effective_desc") {
      return withShippingPrice(b) - withShippingPrice(a);
    }
    if (sort === "mall") {
      return a.mallName.localeCompare(b.mallName, "ko") || a.lprice - b.lprice;
    }
    if (sort === "brand") {
      return (a.brand ?? "").localeCompare(b.brand ?? "", "ko") || a.lprice - b.lprice;
    }
    return 0;
  });
}

export function lowestNaverShoppingItem(
  items: NaverShoppingItem[],
  includeShipping: boolean,
): NaverShoppingItem | null {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => {
    const priceA = includeShipping ? withShippingPrice(a) : a.lprice;
    const priceB = includeShipping ? withShippingPrice(b) : b.lprice;
    return priceA - priceB;
  })[0];
}
