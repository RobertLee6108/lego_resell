import { NextResponse, type NextRequest } from "next/server";
import {
  getDueNaverShoppingWatchTargetsForBatch,
  markNaverShoppingWatchTargetRun,
  saveBatchNaverShoppingRun,
} from "@/lib/data/naver-shopping";
import { searchNaverShoppingMany } from "@/lib/naver-shopping/search";
import type { NaverShoppingSort } from "@/lib/naver-shopping/types";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function assertAuthorized(request: NextRequest): boolean {
  const token = process.env.BATCH_API_TOKEN;
  if (!token) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${token}`;
}

export async function POST(request: NextRequest) {
  if (!assertAuthorized(request)) return unauthorized();

  const targets = await getDueNaverShoppingWatchTargetsForBatch();
  const runs: { targetId: string; runId: string | null; error?: string }[] = [];

  for (const target of targets) {
    try {
      const results = await searchNaverShoppingMany({
        queries: [target.keyword],
        productNumber: target.product_number ?? undefined,
        sort: target.sort as NaverShoppingSort,
        display: target.display,
        excludeUsed: !target.include_used,
        excludeOverseas: !target.include_overseas,
        includeShipping: target.include_shipping,
      });

      const runId = await saveBatchNaverShoppingRun({
        userId: target.user_id,
        input: {
          queries: [target.keyword],
          productNumber: target.product_number ?? undefined,
          sort: target.sort as NaverShoppingSort,
          display: target.display,
          excludeUsed: !target.include_used,
          excludeOverseas: !target.include_overseas,
          includeShipping: target.include_shipping,
        },
        results,
      });

      await markNaverShoppingWatchTargetRun({
        id: target.id,
        intervalMinutes: target.interval_minutes,
      });

      runs.push({ targetId: target.id, runId });
    } catch (error) {
      runs.push({
        targetId: target.id,
        runId: null,
        error: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  return NextResponse.json({ ok: true, processed: targets.length, runs });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
