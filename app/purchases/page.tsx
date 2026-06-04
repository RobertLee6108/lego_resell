import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/layout/EmptyState";
import { StatCard, StatGrid } from "@/components/layout/StatCard";
import { getPurchaseHistory } from "@/lib/data/purchases";
import { getRetailers } from "@/lib/data/retailers";
import { createClient } from "@/lib/supabase/server";
import { PurchaseForm } from "@/components/purchases/PurchaseForm";
import { PurchaseHistoryTable } from "@/components/purchases/PurchaseHistoryTable";
import { RetailerManager } from "@/components/purchases/RetailerManager";
import { OperationalDataReset } from "@/components/layout/OperationalDataReset";
import { formatKrw } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("product_number, name")
    .order("product_number");
  if (error) throw error;
  return data ?? [];
}

export default async function PurchasesPage() {
  const [products, retailers, records] = await Promise.all([
    getProducts(),
    getRetailers(),
    getPurchaseHistory(),
  ]);

  const totalQty = records.reduce((s, r) => s + r.quantity, 0);
  const totalCost = records.reduce((s, r) => s + r.total_effective_cost, 0);
  const avgCostPerUnit = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;

  return (
    <PageShell>
      <PageHeader
        title="구매 이력"
        description="구매 기록 추가·삭제·전체 목록입니다. 매입 수정은 재고 탭에서 품목별로 할 수 있습니다."
      />

      <StatGrid>
        <StatCard label="총 구매 수량" value={`${totalQty}개`} />
        <StatCard label="총 구매 금액" value={formatKrw(totalCost)} />
        <StatCard
          label="개당 평균 매입가"
          value={totalQty > 0 ? formatKrw(avgCostPerUnit) : "—"}
        />
      </StatGrid>

      <PurchaseForm products={products} retailers={retailers} />

      <RetailerManager retailers={retailers} />

      {records.length > 0 ? (
        <PageSection title="구매 이력 목록">
          <PurchaseHistoryTable
            records={records}
            products={products}
            retailers={retailers}
            allowEdit={false}
            allowDelete
          />
        </PageSection>
      ) : (
        <EmptyState
          message="구매 기록이 없습니다."
          hint="위 폼에서 첫 구매를 추가해보세요."
        />
      )}

      <OperationalDataReset />
    </PageShell>
  );
}
