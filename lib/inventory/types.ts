export interface SourcingRecord {
  id: string;
  product_number: string;
  product_name?: string;
  purchased_at: string;
  quantity: number;
  unit_cost: number;
  source_note: string | null;
  memo: string | null;
  created_at: string;
}

export interface SourcingFormInput {
  product_number: string;
  purchased_at: string;
  quantity: number;
  unit_cost: number;
  source_note: string;
  memo: string;
}

export interface InventorySummary {
  product_number: string;
  name: string;
  msrp: number;
  status: string;
  total_sourced: number;
  total_sold: number;
  current_stock: number;
  avg_cost: number | null;
  stock_value: number;
}
