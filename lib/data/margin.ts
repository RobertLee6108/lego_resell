import { createClient } from "@/lib/supabase/server";
import type { MarginSummary } from "@/lib/margin/types";

export async function getMarginSummary(): Promise<MarginSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_margin_summary")
    .select("*")
    .order("net_profit", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MarginSummary[];
}
