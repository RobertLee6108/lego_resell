"use server";

import { revalidatePath } from "next/cache";
import {
  addNaverShoppingWatchTarget,
  deleteNaverShoppingWatchTarget,
  saveNaverShoppingSearchRun,
  toggleNaverShoppingWatchTarget,
} from "@/lib/data/naver-shopping";
import { searchNaverShoppingMany } from "@/lib/naver-shopping/search";
import type {
  NaverShoppingSearchInput,
  NaverShoppingSearchResult,
  NaverShoppingSort,
} from "@/lib/naver-shopping/types";

export interface NaverShoppingActionState {
  ok: boolean;
  error?: string;
  input?: NaverShoppingSearchInput;
  results?: NaverShoppingSearchResult[];
  savedRunId?: string;
}

function parseQueries(formData: FormData): string[] {
  return formData
    .getAll("queries")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function parseSearchInput(formData: FormData): NaverShoppingSearchInput {
  return {
    queries: parseQueries(formData),
    productNumber: (formData.get("product_number") as string) || undefined,
    sort: ((formData.get("sort") as string) || "sim") as NaverShoppingSort,
    display: Number(formData.get("display") ?? 20),
    filter: formData.get("naverpay_only") === "on" ? "naverpay" : undefined,
    excludeUsed: formData.get("exclude_used") === "on",
    excludeOverseas: formData.get("exclude_overseas") === "on",
    includeShipping: formData.get("include_shipping") === "on",
  };
}

export async function actionSearchNaverShopping(
  _prev: NaverShoppingActionState,
  formData: FormData,
): Promise<NaverShoppingActionState> {
  const input = parseSearchInput(formData);
  try {
    const results = await searchNaverShoppingMany(input);
    return { ok: true, input, results };
  } catch (error) {
    return {
      ok: false,
      input,
      error: error instanceof Error ? error.message : "검색에 실패했습니다.",
    };
  }
}

export async function actionSaveNaverShoppingResults(
  input: NaverShoppingSearchInput,
  results: NaverShoppingSearchResult[],
): Promise<NaverShoppingActionState> {
  try {
    const savedRunId = await saveNaverShoppingSearchRun(input, results);
    revalidatePath("/naver-shopping");
    return { ok: true, input, results, savedRunId };
  } catch (error) {
    return {
      ok: false,
      input,
      results,
      error: error instanceof Error ? error.message : "검색 결과 저장에 실패했습니다.",
    };
  }
}

export async function actionAddNaverShoppingWatchTarget(formData: FormData) {
  await addNaverShoppingWatchTarget(formData);
  revalidatePath("/naver-shopping");
}

export async function actionToggleNaverShoppingWatchTarget(formData: FormData) {
  await toggleNaverShoppingWatchTarget(
    formData.get("id") as string,
    formData.get("enabled") === "true",
  );
  revalidatePath("/naver-shopping");
}

export async function actionDeleteNaverShoppingWatchTarget(formData: FormData) {
  await deleteNaverShoppingWatchTarget(formData.get("id") as string);
  revalidatePath("/naver-shopping");
}
