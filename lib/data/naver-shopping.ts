import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  NaverShoppingItem,
  NaverShoppingSavedRun,
  NaverShoppingSearchInput,
  NaverShoppingSearchResult,
  NaverShoppingWatchTarget,
  ProductSearchOption,
} from "@/lib/naver-shopping/types";

export async function getNaverShoppingProducts(): Promise<ProductSearchOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("product_number, name")
    .order("product_number");

  if (error) throw error;
  return data ?? [];
}

export async function getRecentNaverShoppingRuns(
  limit = 5,
): Promise<NaverShoppingSavedRun[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("naver_shopping_search_runs")
    .select("id, queries, sort, display, include_shipping, total, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as NaverShoppingSavedRun[];
}

export async function getNaverShoppingWatchTargets(): Promise<
  NaverShoppingWatchTarget[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("naver_shopping_watch_targets")
    .select(
      "id, product_number, keyword, enabled, interval_minutes, last_run_at, next_run_at, sort, display, include_used, include_overseas, include_shipping, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as NaverShoppingWatchTarget[];
}

function resultInsertRows(
  runId: string,
  items: NaverShoppingItem[],
  userId?: string,
) {
  return items.map((item) => ({
    run_id: runId,
    user_id: userId,
    query: item.query,
    product_number: item.productNumber,
    naver_product_id: item.productId,
    title: item.title,
    link: item.link,
    image: item.image,
    mall_name: item.mallName,
    lprice: item.lprice,
    hprice: item.hprice,
    product_type: item.productType,
    brand: item.brand,
    maker: item.maker,
    category1: item.category1,
    category2: item.category2,
    category3: item.category3,
    category4: item.category4,
    shipping_fee_override: item.shippingFeeOverride,
    raw: item.raw,
  }));
}

export async function saveNaverShoppingSearchRun(
  input: NaverShoppingSearchInput,
  results: NaverShoppingSearchResult[],
): Promise<string> {
  const supabase = await createClient();
  const total = results.reduce((sum, result) => sum + result.total, 0);

  const { data: run, error: runError } = await supabase
    .from("naver_shopping_search_runs")
    .insert({
      queries: input.queries,
      sort: input.sort,
      display: input.display,
      include_shipping: input.includeShipping,
      filter: input.filter ?? null,
      exclude: [
        input.excludeUsed ? "used" : null,
        input.excludeOverseas ? "cbshop" : null,
      ].filter(Boolean).join(":") || null,
      total,
    })
    .select("id")
    .single();

  if (runError) throw runError;

  const rows = resultInsertRows(
    run.id,
    results.flatMap((result) => result.items),
  ).map(({ user_id: _userId, ...row }) => row);

  if (rows.length > 0) {
    const { error: resultError } = await supabase
      .from("naver_shopping_search_results")
      .insert(rows);
    if (resultError) throw resultError;
  }

  return run.id;
}

export async function addNaverShoppingWatchTarget(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("naver_shopping_watch_targets").insert({
    product_number: (formData.get("product_number") as string) || null,
    keyword: ((formData.get("keyword") as string) ?? "").trim(),
    interval_minutes: Number(formData.get("interval_minutes") ?? 60),
    sort: (formData.get("sort") as string) || "asc",
    display: Number(formData.get("display") ?? 20),
    include_used: formData.get("include_used") === "on",
    include_overseas: formData.get("include_overseas") === "on",
    include_shipping: formData.get("include_shipping") === "on",
  });

  if (error) throw error;
}

export async function toggleNaverShoppingWatchTarget(id: string, enabled: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("naver_shopping_watch_targets")
    .update({ enabled })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteNaverShoppingWatchTarget(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("naver_shopping_watch_targets")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getDueNaverShoppingWatchTargetsForBatch(limit = 20) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("naver_shopping_watch_targets")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function saveBatchNaverShoppingRun(params: {
  userId: string;
  input: NaverShoppingSearchInput;
  results: NaverShoppingSearchResult[];
}) {
  const supabase = createAdminClient();
  const total = params.results.reduce((sum, result) => sum + result.total, 0);

  const { data: run, error: runError } = await supabase
    .from("naver_shopping_search_runs")
    .insert({
      user_id: params.userId,
      queries: params.input.queries,
      sort: params.input.sort,
      display: params.input.display,
      include_shipping: params.input.includeShipping,
      filter: params.input.filter ?? null,
      exclude: [
        params.input.excludeUsed ? "used" : null,
        params.input.excludeOverseas ? "cbshop" : null,
      ].filter(Boolean).join(":") || null,
      total,
    })
    .select("id")
    .single();

  if (runError) throw runError;

  const rows = resultInsertRows(
    run.id,
    params.results.flatMap((result) => result.items),
    params.userId,
  );

  if (rows.length > 0) {
    const { error: resultError } = await supabase
      .from("naver_shopping_search_results")
      .insert(rows);
    if (resultError) throw resultError;
  }

  return run.id;
}

export async function markNaverShoppingWatchTargetRun(params: {
  id: string;
  intervalMinutes: number;
}) {
  const supabase = createAdminClient();
  const nextRunAt = new Date(
    Date.now() + params.intervalMinutes * 60 * 1000,
  ).toISOString();

  const { error } = await supabase
    .from("naver_shopping_watch_targets")
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunAt,
    })
    .eq("id", params.id);

  if (error) throw error;
}
