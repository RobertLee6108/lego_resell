import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { StatCard, StatGrid } from "@/components/layout/StatCard";
import { getMarginSummary } from "@/lib/data/margin";
import { getInventorySummary } from "@/lib/data/inventory";
import { calcTotals } from "@/lib/margin/types";
import { MarginSummaryCards } from "@/components/margin/MarginSummaryCards";
import { MarginTable } from "@/components/margin/MarginTable";
import { RecommendedPriceCalculator } from "@/components/margin/RecommendedPriceCalculator";
import { formatKrw } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MarginPage() {
  const [marginRows, inventoryRows] = await Promise.all([
    getMarginSummary(),
    getInventorySummary(),
  ]);

  const totals = calcTotals(marginRows);
  const totalStockValue = inventoryRows.reduce((s, r) => s + r.stock_value, 0);
  const isProfit = totals.net_profit >= 0;

  return (
    <PageShell>
      <PageHeader
        title="마진 관리"
        description="소싱 원가 대비 실 수익과 ROI를 제품별로 확인합니다."
      />

      <PageSection title="권장 판매가">
        <RecommendedPriceCalculator inventoryRows={inventoryRows} />
      </PageSection>

      {marginRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          <p className="font-medium text-zinc-700">아직 마진 데이터가 없습니다.</p>
          <p className="mt-2 text-zinc-600">
            <Link href="/purchases" className="text-emerald-700 underline">
              구매 이력
            </Link>
            에서 매입을 추가하고,{" "}
            <Link href="/sales" className="text-blue-700 underline">
              판매 관리
            </Link>
            에서 판매 기록을 입력하세요.
          </p>
        </div>
      ) : (
        <>
          <StatGrid columns={3}>
            <StatCard
              label="미판매 재고 평가액"
              value={formatKrw(totalStockValue)}
              valueClassName="text-emerald-700"
            />
            <StatCard label="총 판매수익" value={formatKrw(totals.total_revenue)} />
            <StatCard
              label="순이익"
              value={`${isProfit ? "+" : ""}${formatKrw(totals.net_profit)}`}
              valueClassName={isProfit ? "text-emerald-700" : "text-red-600"}
            />
          </StatGrid>

          <MarginSummaryCards totals={totals} />

          <PageSection title="제품별 마진">
            <MarginTable rows={marginRows} />
          </PageSection>
        </>
      )}
    </PageShell>
  );
}
