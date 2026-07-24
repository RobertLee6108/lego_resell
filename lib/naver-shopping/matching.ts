import type { NaverShoppingItem } from "@/lib/naver-shopping/types";

// 품번 변형/파생 상품 의심 키워드. 매칭은 되지만 자동가격매칭 대상에서는 제외한다.
const VARIANT_FLAG_KEYWORDS = ["제외", "단품", "벌크"];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 상품명에 품번이 다른 숫자의 일부가 아닌 독립된 토큰으로 포함되는지 확인 */
export function productNumberAppearsInTitle(
  title: string,
  productNumber: string,
): boolean {
  const pattern = new RegExp(
    `(?<!\\d)${escapeRegExp(productNumber)}(?!\\d)`,
  );
  return pattern.test(title);
}

export function isVariantFlagged(title: string): boolean {
  return VARIANT_FLAG_KEYWORDS.some((kw) => title.includes(kw));
}

export interface NaverItemMatchResult {
  productNumberMatch: boolean;
  variantFlagged: boolean;
  /** 품번이 일치하고, 변형상품·비정품 의심 키워드가 없는 항목만 자동 가격매칭 대상 */
  eligibleForAutoMatch: boolean;
}

export function evaluateNaverItemForRepricing(
  item: Pick<NaverShoppingItem, "title" | "suspicious">,
  productNumber: string,
): NaverItemMatchResult {
  const productNumberMatch = productNumberAppearsInTitle(item.title, productNumber);
  const variantFlagged = isVariantFlagged(item.title);
  return {
    productNumberMatch,
    variantFlagged,
    eligibleForAutoMatch: productNumberMatch && !variantFlagged && !item.suspicious,
  };
}
