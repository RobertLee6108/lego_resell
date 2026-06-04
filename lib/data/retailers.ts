import { createClient } from "@/lib/supabase/server";
import { slugifyTheme } from "@/lib/catalog/slug";
import type { RetailerFormInput, RetailerOption } from "@/lib/retailers/types";

export async function getRetailers(): Promise<RetailerOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("retailers")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data ?? [];
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

export async function addRetailer(input: RetailerFormInput): Promise<void> {
  const supabase = await createClient();
  const baseSlug = slugifyTheme(input.name);
  const slug = await uniqueRetailerSlug(supabase, baseSlug);
  const { error } = await supabase.from("retailers").insert({
    name: input.name.trim(),
    slug,
  });
  if (error) throw error;
}

export async function deleteRetailer(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("retailers").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("연결된 몰 가격·판매 데이터가 있어 삭제할 수 없습니다.");
    }
    throw error;
  }
}
