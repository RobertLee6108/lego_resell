"use server";

import { revalidatePath } from "next/cache";
import { updateProduct } from "@/lib/data/catalog";
import { addListing, deleteListing, saveListing } from "@/lib/data/listings";
import type {
  ListingCreateInput,
  ListingSaveInput,
  ProductUpdateInput,
} from "@/lib/catalog/types";
import type { DiscountRuleInput, ProductStatus } from "@/lib/pricing/types";

function parseProductUpdate(formData: FormData): ProductUpdateInput {
  const rawTheme = formData.get("theme_id") as string;
  const rawRelease = formData.get("release_date") as string;

  return {
    product_number: formData.get("product_number") as string,
    name: formData.get("name") as string,
    msrp: Number(formData.get("msrp")),
    status: (formData.get("status") as ProductStatus) || "on_sale",
    theme_id: rawTheme || null,
    release_date: rawRelease || null,
  };
}

function parseRulesJson(raw: string): DiscountRuleInput[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as DiscountRuleInput[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function actionUpdateProduct(formData: FormData) {
  const input = parseProductUpdate(formData);
  await updateProduct(input);
  revalidatePath("/");
  revalidatePath(`/products/${input.product_number}`);
}

export async function actionAddListing(formData: FormData) {
  const productNumber = formData.get("product_number") as string;
  const input: ListingCreateInput = {
    product_number: productNumber,
    retailer_id: formData.get("retailer_id") as string,
    sale_price: Number(formData.get("sale_price")),
    shipping_fee: Number(formData.get("shipping_fee") ?? 0),
    product_url: (formData.get("product_url") as string) || null,
    in_stock: formData.get("in_stock") === "on",
  };
  await addListing(input);
  revalidatePath("/");
  revalidatePath(`/products/${productNumber}`);
}

export async function actionSaveListing(formData: FormData) {
  const productNumber = formData.get("product_number") as string;
  const input: ListingSaveInput = {
    listing_id: formData.get("listing_id") as string,
    sale_price: Number(formData.get("sale_price")),
    shipping_fee: Number(formData.get("shipping_fee") ?? 0),
    product_url: (formData.get("product_url") as string) || null,
    in_stock: formData.get("in_stock") === "on",
    rules: parseRulesJson(formData.get("rules_json") as string),
  };
  await saveListing(input);
  revalidatePath("/");
  revalidatePath(`/products/${productNumber}`);
}

export async function actionDeleteListing(formData: FormData) {
  const productNumber = formData.get("product_number") as string;
  const listingId = formData.get("listing_id") as string;
  await deleteListing(listingId);
  revalidatePath("/");
  revalidatePath(`/products/${productNumber}`);
}
