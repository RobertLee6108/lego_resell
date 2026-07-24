import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordPriceMonitoringLog } from "@/lib/data/price-monitoring";
import { fetchNaverShopping } from "@/lib/naver-shopping/search";
import { summarizeMonitoringSnapshot } from "@/lib/repricing/monitoringSummary";

export const dynamic = "force-dynamic";

interface NaverPriceCheckBody {
  product_number?: string;
  keyword?: string;
  watch_target_id?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as NaverPriceCheckBody;
  const productNumber = body.product_number?.trim();

  if (!productNumber) {
    return NextResponse.json(
      { ok: false, error: "product_number가 필요합니다." },
      { status: 400 },
    );
  }

  // 순수 품번만으로 검색하면 무관한 상품(모델명·코드에 같은 숫자가 우연히 포함된 것들)이
  // 대거 섞여 들어온다. 기존 /margin 조회(app/margin/actions.ts)와 동일하게 "품번 레고"로 검색한다.
  const query = body.keyword?.trim() || `${productNumber} 레고`;

  try {
    const result = await fetchNaverShopping({
      query,
      display: 40,
      sort: "asc",
      exclude: "used:cbshop",
    });

    const snapshot = summarizeMonitoringSnapshot(result.items, productNumber);

    const logId = await recordPriceMonitoringLog({
      productNumber,
      watchTargetId: body.watch_target_id ?? null,
      snapshot,
      query,
    });

    return NextResponse.json({
      ok: true,
      log_id: logId,
      market_lowest_price: snapshot.marketLowestPrice,
      seller_count: snapshot.sellerCount,
      matched_seller_name: snapshot.matchedSellerName,
      items: snapshot.items,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "네이버 시세 조회 실패" },
      { status: 502 },
    );
  }
}
