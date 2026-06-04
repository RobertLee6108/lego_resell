export interface PurchaseRecord {
  id: string;
  product_number: string;
  product_name: string;
  msrp: number;
  purchased_at: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  effective_price_paid: number | null;
  total_effective_cost: number;
  retailer_id: string | null;
  retailer_name: string | null;
  source_note: string | null;
  memo: string | null;
  created_at: string;
}

export interface PurchaseFormInput {
  product_number: string;
  purchased_at: string;
  quantity: number;
  unit_cost: number;
  effective_price_paid: number | null;
  retailer_id: string | null;
  source_note: string;
  memo: string;
}
