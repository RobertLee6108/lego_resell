"use server";

import { revalidatePath } from "next/cache";
import { addSourcingRecord, deleteSourcingRecord } from "@/lib/data/inventory";
import type { SourcingFormInput } from "@/lib/inventory/types";

export async function actionAddSourcingRecord(formData: FormData) {
  const input: SourcingFormInput = {
    product_number: formData.get("product_number") as string,
    purchased_at: formData.get("purchased_at") as string,
    quantity: Number(formData.get("quantity")),
    unit_cost: Number(formData.get("unit_cost")),
    source_note: (formData.get("source_note") as string) ?? "",
    memo: (formData.get("memo") as string) ?? "",
  };
  await addSourcingRecord(input);
  revalidatePath("/inventory");
}

export async function actionDeleteSourcingRecord(formData: FormData) {
  const id = formData.get("id") as string;
  await deleteSourcingRecord(id);
  revalidatePath("/inventory");
}
