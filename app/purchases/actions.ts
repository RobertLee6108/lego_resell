"use server";

import { revalidatePath } from "next/cache";
import {
  addPurchaseRecord,
  deletePurchaseRecord,
  updatePurchaseRecord,
} from "@/lib/data/purchases";
import { addRetailer, deleteRetailer } from "@/lib/data/retailers";
import type { PurchaseFormInput } from "@/lib/purchases/types";

function parsePurchaseForm(formData: FormData): PurchaseFormInput {
  const rawEffective = formData.get("effective_price_paid") as string;
  const rawRetailer = formData.get("retailer_id") as string;

  return {
    product_number: formData.get("product_number") as string,
    purchased_at: formData.get("purchased_at") as string,
    quantity: Number(formData.get("quantity")),
    unit_cost: Number(formData.get("unit_cost")),
    effective_price_paid: rawEffective ? Number(rawEffective) : null,
    retailer_id: rawRetailer || null,
    source_note: (formData.get("source_note") as string) ?? "",
    memo: (formData.get("memo") as string) ?? "",
  };
}

export async function actionAddPurchaseRecord(formData: FormData) {
  await addPurchaseRecord(parsePurchaseForm(formData));
  revalidatePath("/purchases");
  revalidatePath("/inventory");
}

export async function actionUpdatePurchaseRecord(formData: FormData) {
  const id = formData.get("id") as string;
  await updatePurchaseRecord(id, parsePurchaseForm(formData));
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/margin");
}

export async function actionDeletePurchaseRecord(formData: FormData) {
  const id = formData.get("id") as string;
  await deletePurchaseRecord(id);
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/margin");
}

export async function actionAddRetailer(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  await addRetailer({ name });
  revalidatePath("/purchases");
  revalidatePath("/sales");
  revalidatePath("/");
}

export async function actionDeleteRetailer(formData: FormData) {
  const id = formData.get("id") as string;
  try {
    await deleteRetailer(id);
    revalidatePath("/purchases");
    revalidatePath("/sales");
    revalidatePath("/");
  } catch (e) {
    throw e instanceof Error ? e : new Error("쇼핑몰 삭제에 실패했습니다.");
  }
}
