"use server";

import { revalidatePath } from "next/cache";
import {
  addProduct,
  addTheme,
  deleteProduct,
  deleteTheme,
} from "@/lib/data/catalog";
import type { ProductFormInput } from "@/lib/catalog/types";
import type { ProductStatus } from "@/lib/pricing/types";
import { clearAllOperationalData } from "@/lib/data/operational-reset";

export async function actionAddTheme(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  await addTheme({ name });
  revalidatePath("/");
}

export async function actionDeleteTheme(formData: FormData) {
  const id = formData.get("id") as string;
  await deleteTheme(id);
  revalidatePath("/");
}

export async function actionAddProduct(formData: FormData) {
  const rawTheme = formData.get("theme_id") as string;
  const rawRelease = formData.get("release_date") as string;

  const input: ProductFormInput = {
    product_number: formData.get("product_number") as string,
    name: formData.get("name") as string,
    msrp: Number(formData.get("msrp")),
    status: (formData.get("status") as ProductStatus) || "on_sale",
    theme_id: rawTheme || null,
    release_date: rawRelease || null,
  };
  await addProduct(input);
  revalidatePath("/");
}

export async function actionDeleteProduct(formData: FormData) {
  const productNumber = formData.get("product_number") as string;
  try {
    await deleteProduct(productNumber);
    revalidatePath("/");
  } catch (e) {
    throw e instanceof Error ? e : new Error("제품 삭제에 실패했습니다.");
  }
}

export async function actionClearOperationalData() {
  const result = await clearAllOperationalData();
  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/sales");
  revalidatePath("/margin");
  return result;
}
