/** 판매 기록·마진 뷰와 동일: round(매출 × 수수료율 / 100) */
export function calcPlatformFee(revenue: number, platformFeeRate: number): number {
  return Math.round((revenue * platformFeeRate) / 100);
}

export function calcUnitNetProfit(
  unitSalePrice: number,
  unitCost: number,
  platformFeeRate: number,
  shippingOutCost: number,
): number {
  const fee = calcPlatformFee(unitSalePrice, platformFeeRate);
  return unitSalePrice - fee - shippingOutCost - unitCost;
}

export interface RecommendedPriceBreakdown {
  recommended_price: number;
  platform_fee: number;
  shipping_out_cost: number;
  unit_cost: number;
  net_profit: number;
  roi_pct: number | null;
  net_after_fees: number;
}

export function recommendPriceByTargetProfit(
  unitCost: number,
  targetProfit: number,
  platformFeeRate: number,
  shippingOutCost: number,
): RecommendedPriceBreakdown | null {
  if (
    unitCost < 0 ||
    targetProfit < 0 ||
    platformFeeRate < 0 ||
    platformFeeRate >= 100 ||
    shippingOutCost < 0
  ) {
    return null;
  }

  const netBeforeFee = unitCost + targetProfit + shippingOutCost;
  let price = Math.ceil(netBeforeFee / (1 - platformFeeRate / 100));

  while (price < 1_000_000_000) {
    const netProfit = calcUnitNetProfit(price, unitCost, platformFeeRate, shippingOutCost);
    if (netProfit >= targetProfit) {
      const fee = calcPlatformFee(price, platformFeeRate);
      return {
        recommended_price: price,
        platform_fee: fee,
        shipping_out_cost: shippingOutCost,
        unit_cost: unitCost,
        net_profit: netProfit,
        roi_pct:
          unitCost > 0 ? Math.round((netProfit / unitCost) * 1000) / 10 : null,
        net_after_fees: price - fee - shippingOutCost,
      };
    }
    price++;
  }

  return null;
}

export function recommendPriceByMarginRate(
  unitCost: number,
  marginRatePct: number,
  platformFeeRate: number,
  shippingOutCost: number,
): RecommendedPriceBreakdown | null {
  if (unitCost <= 0) return null;
  const targetProfit = Math.round((unitCost * marginRatePct) / 100);
  return recommendPriceByTargetProfit(unitCost, targetProfit, platformFeeRate, shippingOutCost);
}
