import { createClient } from "@/lib/supabase/server";
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
