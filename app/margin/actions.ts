"use server";

import { searchNaverShoppingMany } from "@/lib/naver-shopping/search";

export interface NaverMarketData {
  catalogLowestPrice: number;
  competitorCount: number;
  avgSellingPrice: number;
  suspiciousCount: number;
}

export type NaverMarketDataResult =
  | { ok: true; data: NaverMarketData }
  | { ok: false; error: string };

export async function actionFetchNaverMarketData(
  productNumber: string,
): Promise<NaverMarketDataResult> {
  try {
    const [result] = await searchNaverShoppingMany({
      queries: [`${productNumber} 레고`],
      sort: "sim",
      display: 30,
      excludeUsed: true,
      excludeOverseas: false,
      includeShipping: false,
    });

    const genuine = result.items.filter((item) => !item.suspicious);

    if (genuine.length === 0) {
      return { ok: false, error: "정품으로 판단되는 검색 결과가 없습니다." };
    }

    const catalogLowestPrice = Math.min(...genuine.map((item) => item.lprice));
    const avgSellingPrice = Math.round(
      genuine.reduce((sum, item) => sum + item.lprice, 0) / genuine.length,
    );

    return {
      ok: true,
      data: {
        catalogLowestPrice,
        competitorCount: genuine.length,
        avgSellingPrice,
        suspiciousCount: result.items.length - genuine.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "시세 조회에 실패했습니다.",
    };
  }
}
