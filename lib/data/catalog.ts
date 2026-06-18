import { createClient } from "@/lib/supabase/server";
import { slugifyTheme } from "@/lib/catalog/slug";
import type { ProductFormInput, ProductUpdateInput, ThemeFormInput } from "@/lib/catalog/types";
import type { ProductStatus } from "@/lib/pricing/types";
import type { ProductCardProps } from "@/components/products/ProductCard";

export interface CatalogFilters {
  themeId?: string;
  status?: ProductStatus;
}

export async function getThemes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("themes")
    .select("id, name, slug")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getCatalogProducts(
  filters: CatalogFilters = {},
): Promise<ProductCardProps[]> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      `
      product_number,
      name,
      msrp,
      status,
      theme_id,
      themes ( name )
    `,
    )
    .order("product_number");

  if (filters.themeId) {
    query = query.eq("theme_id", filters.themeId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data: products, error: productsError } = await query;
  if (productsError) throw productsError;

  return (products ?? []).map((p) => {
    const rawTheme = p.themes as { name: string } | { name: string }[] | null;
    const theme = Array.isArray(rawTheme) ? rawTheme[0] : rawTheme;
    return {
      productNumber: p.product_number,
      name: p.name,
      msrp: p.msrp,
      status: p.status as ProductStatus,
      themeId: p.theme_id,
      themeName: theme?.name ?? null,
    };
  });
}

async function uniqueThemeSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase
      .from("themes")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  }
  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function addTheme(input: ThemeFormInput): Promise<void> {
  const supabase = await createClient();
  const baseSlug = slugifyTheme(input.name);
  const slug = await uniqueThemeSlug(supabase, baseSlug);
  const { error } = await supabase.from("themes").insert({
    name: input.name.trim(),
    slug,
  });
  if (error) throw error;
}

export async function deleteTheme(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("themes").delete().eq("id", id);
  if (error) throw error;
}

export async function addProduct(input: ProductFormInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    product_number: input.product_number.trim(),
    name: input.name.trim(),
    msrp: input.msrp,
    status: input.status,
    theme_id: input.theme_id || null,
    release_date: input.release_date || null,
  });
  if (error) throw error;
}

export async function updateProduct(input: ProductUpdateInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: input.name.trim(),
      msrp: input.msrp,
      status: input.status,
      theme_id: input.theme_id || null,
      release_date: input.release_date || null,
    })
    .eq("product_number", input.product_number.trim());
  if (error) throw error;
}

export async function deleteProduct(productNumber: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("product_number", productNumber);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "구매·판매 이력이 있는 제품은 삭제할 수 없습니다. 이력을 먼저 제거하세요.",
      );
    }
    throw error;
  }
}
