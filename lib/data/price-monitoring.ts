import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MonitoringSnapshot } from "@/lib/repricing/monitoringSummary";
import type { PriceMonitoringLogEntry } from "@/lib/repricing/types";

function insertRow(params: {
  productNumber: string;
  watchTargetId: string | null;
  snapshot: MonitoringSnapshot;
  query: string;
  userId?: string;
}) {
  return {
    user_id: params.userId,
    product_number: params.productNumber,
    watch_target_id: params.watchTargetId,
    market_lowest_price: params.snapshot.marketLowestPrice,
    seller_count: params.snapshot.sellerCount,
    matched_seller_name: params.snapshot.matchedSellerName,
    raw_response: { query: params.query, items: params.snapshot.items },
  };
}

export async function recordPriceMonitoringLog(params: {
  productNumber: string;
  watchTargetId?: string | null;
  snapshot: MonitoringSnapshot;
  query: string;
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_monitoring_log")
    .insert(
      insertRow({
        productNumber: params.productNumber,
        watchTargetId: params.watchTargetId ?? null,
        snapshot: params.snapshot,
        query: params.query,
      }),
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function recordPriceMonitoringLogAdmin(params: {
  userId: string;
  productNumber: string;
  watchTargetId?: string | null;
  snapshot: MonitoringSnapshot;
  query: string;
}): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("price_monitoring_log")
    .insert(
      insertRow({
        productNumber: params.productNumber,
        watchTargetId: params.watchTargetId ?? null,
        snapshot: params.snapshot,
        query: params.query,
        userId: params.userId,
      }),
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getRecentPriceMonitoringLogs(
  productNumber: string,
  sinceHours = 72,
): Promise<PriceMonitoringLogEntry[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("price_monitoring_log")
    .select(
      "id, product_number, watch_target_id, checked_at, market_lowest_price, seller_count, matched_seller_name, is_soon_out_of_stock, raw_response, created_at",
    )
    .eq("product_number", productNumber)
    .gte("checked_at", since)
    .order("checked_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PriceMonitoringLogEntry[];
}
