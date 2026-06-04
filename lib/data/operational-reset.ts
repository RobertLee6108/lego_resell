import { createClient } from "@/lib/supabase/server";

/** 구매·판매 원본 이력 삭제 (재고·마진 뷰는 자동으로 비워짐) */
export async function clearAllOperationalData(): Promise<{
  purchasesDeleted: number;
  salesDeleted: number;
}> {
  const supabase = await createClient();

  const { count: purchaseCount } = await supabase
    .from("sourcing_records")
    .select("*", { count: "exact", head: true });

  const { count: salesCount } = await supabase
    .from("sales_records")
    .select("*", { count: "exact", head: true });

  const { error: purchaseError } = await supabase
    .from("sourcing_records")
    .delete()
    .neq("product_number", "");

  if (purchaseError) throw purchaseError;

  const { error: salesError } = await supabase
    .from("sales_records")
    .delete()
    .neq("product_number", "");

  if (salesError) throw salesError;

  return {
    purchasesDeleted: purchaseCount ?? 0,
    salesDeleted: salesCount ?? 0,
  };
}
