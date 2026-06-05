import { createClient } from "@/lib/supabase/server";
import type {
  ListingCreateInput,
  ListingSaveInput,
} from "@/lib/catalog/types";
import type { DiscountRuleInput } from "@/lib/pricing/types";

function activeRules(rules: DiscountRuleInput[]) {
  return rules.filter(
    (r) =>
      (r.percent != null && r.percent > 0) ||
      (r.fixed_amount != null && r.fixed_amount > 0),
  );
}

async function replaceListingRules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  rules: DiscountRuleInput[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("listing_discount_rules")
    .delete()
    .eq("listing_id", listingId);
  if (deleteError) throw deleteError;

  const rows = activeRules(rules);
  if (rows.length === 0) return;

  const { error: insertError } = await supabase
    .from("listing_discount_rules")
    .insert(
      rows.map((r) => ({
        listing_id: listingId,
        rule_type: r.rule_type,
        label: r.label,
        percent: r.percent,
        fixed_amount: r.fixed_amount,
        apply_order: r.apply_order,
        is_active: true,
      })),
    );
  if (insertError) throw insertError;
}

export async function addListing(input: ListingCreateInput): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_listings")
    .insert({
      product_number: input.product_number.trim(),
      retailer_id: input.retailer_id,
      sale_price: input.sale_price,
      shipping_fee: input.shipping_fee,
      product_url: input.product_url?.trim() || null,
      in_stock: input.in_stock ?? true,
      last_checked_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("이 쇼핑몰 리스팅이 이미 있습니다. 기존 항목을 수정하세요.");
    }
    throw error;
  }
  await replaceListingRules(supabase, data.id, []);
}

export async function saveListing(input: ListingSaveInput): Promise<void> {
  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("product_listings")
    .update({
      sale_price: input.sale_price,
      shipping_fee: input.shipping_fee,
      product_url: input.product_url?.trim() || null,
      in_stock: input.in_stock ?? true,
      last_checked_at: new Date().toISOString(),
    })
    .eq("id", input.listing_id);
  if (updateError) throw updateError;

  await replaceListingRules(supabase, input.listing_id, input.rules);
}

export async function deleteListing(listingId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_listings")
    .delete()
    .eq("id", listingId);
  if (error) throw error;
}
