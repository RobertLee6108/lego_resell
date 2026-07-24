export type TargetFormulaType = "catalog_lowest_minus_100";

export type RepricingTriggerReason =
  | "dead_zone_exceeded"
  | "persistence_confirmed"
  | "soon_out_of_stock_hold"
  | "manual";

export type RepricingApprovedBy = "telegram" | "auto";

export type RepricingHoldReason = "competitor_soon_out_of_stock";

export interface RepricingRule {
  product_number: string;
  target_formula_type: TargetFormulaType;
  dead_zone_won: number;
  min_margin_won: number;
  bep_price: number;
  floor_price: number | null;
  enabled: boolean;
  hold_reason: RepricingHoldReason | null;
  hold_until: string | null;
  hold_recheck_hours: number;
  created_at: string;
  updated_at: string;
}

export interface PriceMonitoringLogEntry {
  id: string;
  product_number: string;
  watch_target_id: string | null;
  checked_at: string;
  market_lowest_price: number | null;
  seller_count: number;
  matched_seller_name: string | null;
  is_soon_out_of_stock: boolean;
  raw_response: unknown;
  created_at: string;
}

export interface RepricingHistoryEntry {
  id: string;
  product_number: string;
  monitoring_log_id: string | null;
  old_price: number;
  new_price: number;
  trigger_reason: RepricingTriggerReason;
  approved_by: RepricingApprovedBy;
  created_at: string;
}
