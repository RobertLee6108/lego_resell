import { createClient } from "@/lib/supabase/server";
import { mapDiscountRule } from "@/lib/data/mappers";
import type { RetailerRowData } from "@/components/pricing/RetailerPriceRow";
import type { ProductStatus } from "@/lib/pricing/types";
import type { Database } from "@/types/database";

type RuleRow = Database["public"]["Tables"]["listing_discount_rules"]["Row"];

export interface ProductDetail {
  productNumber: string;
  name: string;
  msrp: number;
  status: ProductStatus;
  releaseDate: string | null;
  themeId: string | null;
  themeName: string | null;
  notes: string | null;
  listings: RetailerRowData[];
}

export async function getProductDetail(
  productNumber: string,
): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
      product_number,
      name,
      msrp,
      status,
      release_date,
      notes,
      theme_id,
      themes ( name )
    `,
    )
    .eq("product_number", productNumber)
    .maybeSingle();

  if (error) throw error;
  if (!product) return null;

  const { data: listings, error: listError } = await supabase
    .from("product_listings")
    .select(
      `
      id,
      sale_price,
      shipping_fee,
      product_url,
      in_stock,
      retailers ( id, name, slug, logo_url ),
      listing_discount_rules (
        id,
        rule_type,
        label,
        percent,
        fixed_amount,
        apply_order,
        is_active
      )
    `,
    )
    .eq("product_number", productNumber);

  if (listError) throw listError;

  const rows: RetailerRowData[] = (listings ?? []).map((pl) => {
    const rawRetailer = pl.retailers as
      | { id: string; name: string; slug: string; logo_url: string | null }
      | { id: string; name: string; slug: string; logo_url: string | null }[];
    const retailer = Array.isArray(rawRetailer) ? rawRetailer[0] : rawRetailer;
    const rules = ((pl.listing_discount_rules as RuleRow[]) ?? [])
      .filter((r) => r.is_active)
      .sort((a, b) => a.apply_order - b.apply_order)
      .map(mapDiscountRule);

    return {
      listing_id: pl.id,
      retailer_id: retailer.id,
      retailer_name: retailer.name,
      retailer_slug: retailer.slug,
      sale_price: pl.sale_price,
      shipping_fee: pl.shipping_fee,
      product_url: pl.product_url,
      in_stock: pl.in_stock,
      rules,
    };
  });

  const rawTheme = product.themes as { name: string } | { name: string }[] | null;
  const theme = Array.isArray(rawTheme) ? rawTheme[0] : rawTheme;

  return {
    productNumber: product.product_number,
    name: product.name,
    msrp: product.msrp,
    status: product.status as ProductStatus,
    releaseDate: product.release_date,
    themeId: product.theme_id,
    themeName: theme?.name ?? null,
    notes: product.notes,
    listings: rows,
  };
}
