"use server";

import { revalidatePath } from "next/cache";
import {
  addSalesRecord,
  deleteSalesRecord,
  getExistingNaverExternalOrderIds,
  importNaverSettlementRows,
} from "@/lib/data/sales";
import type { NaverImportResult, NaverImportRow } from "@/lib/sales/naverSettlementTypes";
import type { SalesFormInput } from "@/lib/sales/types";

export async function actionAddSalesRecord(formData: FormData) {
  const input: SalesFormInput = {
    product_number: formData.get("product_number") as string,
    retailer_id: (formData.get("retailer_id") as string) ?? "",
    sold_at: formData.get("sold_at") as string,
    quantity: Number(formData.get("quantity")),
    unit_sale_price: Number(formData.get("unit_sale_price")),
    platform_fee_rate: Number(formData.get("platform_fee_rate")),
    shipping_out_cost: Number(formData.get("shipping_out_cost")),
    memo: (formData.get("memo") as string) ?? "",
  };
  await addSalesRecord(input);
  revalidatePath("/sales");
  revalidatePath("/margin");
}

export async function actionDeleteSalesRecord(formData: FormData) {
  const id = formData.get("id") as string;
  await deleteSalesRecord(id);
  revalidatePath("/sales");
  revalidatePath("/margin");
}

export async function actionGetNaverExistingOrderIds(
  externalOrderIds: string[],
): Promise<string[]> {
  const existing = await getExistingNaverExternalOrderIds(externalOrderIds);
  return [...existing];
}

export async function actionImportNaverSettlement(
  rows: NaverImportRow[],
): Promise<NaverImportResult> {
  const result = await importNaverSettlementRows(rows);
  revalidatePath("/sales");
  revalidatePath("/margin");
  return result;
}
