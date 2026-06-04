import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { StatCard, StatGrid } from "@/components/layout/StatCard";
import { getInventorySummary } from "@/lib/data/inventory";
import { getPurchaseHistory } from "@/lib/data/purchases";
import { getRetailers } from "@/lib/data/retailers";
import { createClient } from "@/lib/supabase/server";
import { InventoryTable } from "@/components/inventory/InventoryTable";
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

export default async function InventoryPage() {
  const [summary, purchaseRecords, products, retailers] = await Promise.all([
    getInventorySummary(),
    getPurchaseHistory(),
    getProducts(),
    getRetailers(),
  ]);

  const totalStockValue = summary.reduce((s, r) => s + r.stock_value, 0);
  const totalItems = summary.reduce((s, r) => s + r.current_stock, 0);
  const totalProducts = summary.filter((r) => r.current_stock > 0).length;

  return (
    <PageShell>
      <PageHeader
        title="재고 현황"
        description="품목별 재고를 확인하고, 행을 펼쳐 매입 이력을 수정할 수 있습니다."
      />

      <StatGrid>
        <StatCard label="총 재고 수량" value={`${totalItems}개`} />
        <StatCard
          label="재고 평가액"
          value={formatKrw(totalStockValue)}
          valueClassName="text-emerald-700"
        />
        <StatCard label="보유 품목 수" value={`${totalProducts}종`} />
      </StatGrid>

      <PageSection title="품목별 재고">
        <InventoryTable
          rows={summary}
          purchaseRecords={purchaseRecords}
          products={products}
          retailers={retailers}
        />
      </PageSection>
    </PageShell>
  );
}
