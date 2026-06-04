import { createClient } from "@/lib/supabase/server";
import type { PurchaseFormInput, PurchaseRecord } from "@/lib/purchases/types";

export async function getPurchaseHistory(): Promise<PurchaseRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_purchase_history")
    .select("*");
  if (error) throw error;
  return (data ?? []) as PurchaseRecord[];
}

export async function addPurchaseRecord(input: PurchaseFormInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("sourcing_records").insert({
    product_number: input.product_number,
    purchased_at: input.purchased_at,
    quantity: input.quantity,
    unit_cost: input.unit_cost,
    effective_price_paid: input.effective_price_paid ?? null,
    retailer_id: input.retailer_id || null,
    source_note: input.source_note || null,
    memo: input.memo || null,
  });
  if (error) throw error;
}

export async function updatePurchaseRecord(
  id: string,
  input: PurchaseFormInput,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sourcing_records")
    .update({
      product_number: input.product_number,
      purchased_at: input.purchased_at,
      quantity: input.quantity,
      unit_cost: input.unit_cost,
      effective_price_paid: input.effective_price_paid ?? null,
      retailer_id: input.retailer_id || null,
      source_note: input.source_note || null,
      memo: input.memo || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePurchaseRecord(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sourcing_records")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
