export interface MarginSummary {
  product_number: string;
  name: string;
  msrp: number;
  total_sold: number;
  total_revenue: number;
  total_platform_fee: number;
  total_shipping_out: number;
  total_cost_basis: number;
  net_profit: number;
  roi_pct: number | null;
}

export interface MarginTotals {
  total_revenue: number;
  total_cost_basis: number;
  total_platform_fee: number;
  total_shipping_out: number;
  net_profit: number;
  roi_pct: number | null;
}

export function calcTotals(rows: MarginSummary[]): MarginTotals {
  const r = rows.reduce(
    (acc, row) => ({
      total_revenue: acc.total_revenue + row.total_revenue,
      total_cost_basis: acc.total_cost_basis + row.total_cost_basis,
      total_platform_fee: acc.total_platform_fee + row.total_platform_fee,
      total_shipping_out: acc.total_shipping_out + row.total_shipping_out,
      net_profit: acc.net_profit + row.net_profit,
    }),
    {
      total_revenue: 0,
      total_cost_basis: 0,
      total_platform_fee: 0,
      total_shipping_out: 0,
      net_profit: 0,
    },
  );

  return {
    ...r,
    roi_pct:
      r.total_cost_basis > 0
        ? Math.round((r.net_profit / r.total_cost_basis) * 1000) / 10
        : null,
  };
}
