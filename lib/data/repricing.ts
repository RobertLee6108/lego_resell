import { createClient } from "@/lib/supabase/server";
import type {
  RepricingApprovedBy,
  RepricingHistoryEntry,
  RepricingRule,
  RepricingTriggerReason,
} from "@/lib/repricing/types";

const RULE_COLUMNS =
  "product_number, target_formula_type, dead_zone_won, min_margin_won, bep_price, floor_price, enabled, hold_reason, hold_until, hold_recheck_hours, created_at, updated_at";

export async function listRepricingRules(): Promise<RepricingRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repricing_rules")
    .select(RULE_COLUMNS)
    .order("product_number");

  if (error) throw error;
  return (data ?? []) as RepricingRule[];
}

export async function getRepricingRule(
  productNumber: string,
): Promise<RepricingRule | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repricing_rules")
    .select(RULE_COLUMNS)
    .eq("product_number", productNumber)
    .maybeSingle();

  if (error) throw error;
  return data as RepricingRule | null;
}

export interface UpsertRepricingRuleInput {
  product_number: string;
  dead_zone_won: number;
  min_margin_won: number;
  bep_price: number;
  floor_price: number | null;
  enabled: boolean;
  hold_recheck_hours: number;
}

export async function upsertRepricingRule(
  input: UpsertRepricingRuleInput,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("repricing_rules").upsert(input, {
    onConflict: "product_number",
  });
  if (error) throw error;
}

export async function setRepricingHold(params: {
  productNumber: string;
  holdReason: "competitor_soon_out_of_stock" | null;
  holdUntil: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("repricing_rules")
    .update({ hold_reason: params.holdReason, hold_until: params.holdUntil })
    .eq("product_number", params.productNumber);
  if (error) throw error;
}

export async function insertRepricingHistory(input: {
  productNumber: string;
  monitoringLogId: string | null;
  oldPrice: number;
  newPrice: number;
  triggerReason: RepricingTriggerReason;
  approvedBy: RepricingApprovedBy;
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repricing_history")
    .insert({
      product_number: input.productNumber,
      monitoring_log_id: input.monitoringLogId,
      old_price: input.oldPrice,
      new_price: input.newPrice,
      trigger_reason: input.triggerReason,
      approved_by: input.approvedBy,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function listRepricingHistory(
  productNumber: string,
  limit = 20,
): Promise<RepricingHistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("repricing_history")
    .select(
      "id, product_number, monitoring_log_id, old_price, new_price, trigger_reason, approved_by, created_at",
    )
    .eq("product_number", productNumber)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as RepricingHistoryEntry[];
}
