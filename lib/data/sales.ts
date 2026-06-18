import { createClient } from "@/lib/supabase/server";
import { slugifyTheme } from "@/lib/catalog/slug";
import {
  NAVER_RETAILER_NAME,
  NAVER_SETTLEMENT_IMPORT_SOURCE,
} from "@/lib/sales/naverSettlementColumns";
import type { NaverImportResult, NaverImportRow } from "@/lib/sales/naverSettlementTypes";
import type { SalesFormInput, SalesRecord } from "@/lib/sales/types";

export async function getSalesRecords(): Promise<SalesRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_records")
    .select("*, products(name), retailers(name)")
    .order("sold_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    product_name: (r.products as { name: string } | null)?.name,
    retailer_name:
      (r.retailers as { name: string } | null)?.name ?? null,
  }));
}

export async function addSalesRecord(input: SalesFormInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("sales_records").insert({
    product_number: input.product_number,
    retailer_id: input.retailer_id || null,
    sold_at: input.sold_at,
    quantity: input.quantity,
    unit_sale_price: input.unit_sale_price,
    platform_fee_rate: input.platform_fee_rate,
    shipping_out_cost: input.shipping_out_cost,
    memo: input.memo || null,
  });
  if (error) throw error;
}

export async function deleteSalesRecord(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sales_records")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getExistingNaverExternalOrderIds(
  externalOrderIds: string[],
): Promise<Set<string>> {
  if (externalOrderIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_records")
    .select("external_order_id")
    .eq("import_source", NAVER_SETTLEMENT_IMPORT_SOURCE)
    .in("external_order_id", externalOrderIds);

  if (error) throw error;

  return new Set(
    (data ?? [])
      .map((row) => row.external_order_id)
      .filter((id): id is string => Boolean(id)),
  );
}

async function uniqueRetailerSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase
      .from("retailers")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  }
  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function ensureNaverRetailer(): Promise<string> {
  const supabase = await createClient();
  const { data: existing, error: findError } = await supabase
    .from("retailers")
    .select("id")
    .eq("name", NAVER_RETAILER_NAME)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing.id;

  const baseSlug = slugifyTheme(NAVER_RETAILER_NAME);
  const slug = await uniqueRetailerSlug(supabase, baseSlug);
  const { data: created, error: insertError } = await supabase
    .from("retailers")
    .insert({ name: NAVER_RETAILER_NAME, slug })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
}

export async function importNaverSettlementRows(
  rows: NaverImportRow[],
): Promise<NaverImportResult> {
  const result: NaverImportResult = {
    inserted: 0,
    skipped_duplicate: 0,
    skipped_invalid: 0,
    errors: [],
  };

  if (rows.length === 0) return result;

  const retailerId = await ensureNaverRetailer();
  const supabase = await createClient();
  const existingIds = await getExistingNaverExternalOrderIds(
    rows.map((r) => r.external_order_id),
  );

  const toInsert = rows.filter((row) => {
    if (!row.product_number || !row.sold_at || !row.external_order_id) {
      result.skipped_invalid++;
      return false;
    }
    if (existingIds.has(row.external_order_id)) {
      result.skipped_duplicate++;
      return false;
    }
    return true;
  });

  if (toInsert.length === 0) return result;

  const payload = toInsert.map((row) => ({
    product_number: row.product_number,
    retailer_id: retailerId,
    sold_at: row.sold_at,
    quantity: row.quantity,
    unit_sale_price: row.unit_sale_price,
    platform_fee_rate: row.platform_fee_rate,
    shipping_out_cost: 0,
    import_source: NAVER_SETTLEMENT_IMPORT_SOURCE,
    external_order_id: row.external_order_id,
    memo: row.memo || null,
  }));

  const { error } = await supabase.from("sales_records").insert(payload);

  if (error) {
    if (error.code === "23505") {
      result.errors.push("일부 행이 중복되어 저장되지 않았습니다.");
      return result;
    }
    throw error;
  }

  result.inserted = toInsert.length;
  return result;
}
