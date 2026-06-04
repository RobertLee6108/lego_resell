import { createClient } from "@/lib/supabase/server";
import type { InventorySummary, SourcingFormInput, SourcingRecord } from "@/lib/inventory/types";

export async function getSourcingRecords(): Promise<SourcingRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sourcing_records")
    .select("*, products(name)")
    .order("purchased_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    product_name: (r.products as { name: string } | null)?.name,
  }));
}

export async function addSourcingRecord(input: SourcingFormInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("sourcing_records").insert({
    product_number: input.product_number,
    purchased_at: input.purchased_at,
    quantity: input.quantity,
    unit_cost: input.unit_cost,
    source_note: input.source_note || null,
    memo: input.memo || null,
  });
  if (error) throw error;
}

export async function deleteSourcingRecord(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sourcing_records")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getInventorySummary(): Promise<InventorySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_inventory_summary")
    .select("*")
    .order("product_number");
  if (error) throw error;
  return (data ?? []) as InventorySummary[];
}
