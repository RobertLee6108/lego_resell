import { formatKrw } from "@/lib/format";

export interface CostVsMsrp {
  msrp: number;
  avgCost: number;
  discountPct: number | null;
  discountAmount: number;
}

export function calcCostVsMsrp(
  msrp: number,
  avgCost: number,
): CostVsMsrp | null {
  if (avgCost < 0 || !Number.isFinite(avgCost)) return null;

  const discountPct =
    msrp > 0
      ? Math.round(((msrp - avgCost) / msrp) * 1000) / 10
      : null;
  const discountAmount =
    msrp > 0 && avgCost <= msrp ? msrp - avgCost : 0;

  return {
    msrp,
    avgCost,
    discountPct,
    discountAmount,
  };
}

export function formatCostVsMsrpLabel(v: CostVsMsrp): string {
  const parts = [
    `정가 ${formatKrw(v.msrp)}`,
    `원가 ${formatKrw(v.avgCost)}`,
  ];
  if (v.discountPct != null) {
    parts.push(`할인율 ${v.discountPct}%`);
    if (v.discountAmount > 0) {
      parts.push(`(−${formatKrw(v.discountAmount)})`);
    }
  }
  return parts.join(" · ");
}
