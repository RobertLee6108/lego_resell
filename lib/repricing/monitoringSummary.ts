import { evaluateNaverItemForRepricing } from "@/lib/naver-shopping/matching";
import type { NaverShoppingItem } from "@/lib/naver-shopping/types";

export interface MonitoringSnapshotItem {
  title: string;
  mallName: string;
  effectivePrice: number;
  eligibleForAutoMatch: boolean;
  variantFlagged: boolean;
}

export interface MonitoringSnapshot {
  marketLowestPrice: number | null;
  sellerCount: number;
  matchedSellerName: string | null;
  /** 참고용: 매칭/제외 판단 근거를 그대로 보존 (raw_response 저장용) */
  items: MonitoringSnapshotItem[];
}

/** Naver 검색 결과에서 품번이 일치하고 변형상품·비정품 의심이 아닌 항목만으로 최저가 스냅샷을 만든다 */
export function summarizeMonitoringSnapshot(
  items: Pick<NaverShoppingItem, "title" | "mallName" | "effectivePrice" | "suspicious">[],
  productNumber: string,
): MonitoringSnapshot {
  const evaluated = items.map((item) => {
    const match = evaluateNaverItemForRepricing(item, productNumber);
    return {
      title: item.title,
      mallName: item.mallName,
      effectivePrice: item.effectivePrice,
      eligibleForAutoMatch: match.eligibleForAutoMatch,
      variantFlagged: match.variantFlagged,
    };
  });

  const eligible = evaluated.filter((item) => item.eligibleForAutoMatch);

  if (eligible.length === 0) {
    return {
      marketLowestPrice: null,
      sellerCount: 0,
      matchedSellerName: null,
      items: evaluated,
    };
  }

  const lowest = eligible.reduce((min, item) =>
    item.effectivePrice < min.effectivePrice ? item : min,
  );

  return {
    marketLowestPrice: lowest.effectivePrice,
    sellerCount: eligible.length,
    matchedSellerName: lowest.mallName,
    items: evaluated,
  };
}
