export interface SalesRecord {
  id: string;
  product_number: string;
  product_name?: string;
  retailer_id: string | null;
  retailer_name?: string | null;
  sold_at: string;
  quantity: number;
  unit_sale_price: number;
  platform_fee_rate: number;
  shipping_out_cost: number;
  import_source: string | null;
  memo: string | null;
  created_at: string;
}

export interface SalesFormInput {
  product_number: string;
  retailer_id: string;
  sold_at: string;
  quantity: number;
  unit_sale_price: number;
  platform_fee_rate: number;
  shipping_out_cost: number;
  memo: string;
}

export function calcSaleNetRevenue(
  unitSalePrice: number,
  quantity: number,
  platformFeeRate: number,
  shippingOutCost: number,
): number {
  const revenue = unitSalePrice * quantity;
  const fee = Math.round((revenue * platformFeeRate) / 100);
  return revenue - fee - shippingOutCost;
}
