import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { StatCard, StatGrid } from "@/components/layout/StatCard";
import { getSalesRecords } from "@/lib/data/sales";
import { createClient } from "@/lib/supabase/server";
import { SalesForm } from "@/components/sales/SalesForm";
import { SalesTable } from "@/components/sales/SalesTable";
import { formatKrw } from "@/lib/format";
import { calcSaleNetRevenue } from "@/lib/sales/types";

export const dynamic = "force-dynamic";

async function getSelectData() {
  const supabase = await createClient();
  const [{ data: products }, { data: retailers }] = await Promise.all([
    supabase.from("products").select("product_number, name").order("product_number"),
    supabase.from("retailers").select("id, name").order("name"),
  ]);
  return { products: products ?? [], retailers: retailers ?? [] };
}

export default async function SalesPage() {
  const [{ products, retailers }, records] = await Promise.all([
    getSelectData(),
    getSalesRecords(),
  ]);

  const totalRevenue = records.reduce((s, r) => s + r.unit_sale_price * r.quantity, 0);
  const totalNet = records.reduce(
    (s, r) =>
      s + calcSaleNetRevenue(r.unit_sale_price, r.quantity, r.platform_fee_rate, r.shipping_out_cost),
    0,
  );
  const totalQty = records.reduce((s, r) => s + r.quantity, 0);

  return (
    <PageShell>
      <PageHeader
        title="판매 관리"
        description="판매 기록을 추가하고 실수령액을 확인합니다."
      />

      <StatGrid>
        <StatCard label="총 판매 수량" value={`${totalQty}개`} />
        <StatCard label="총 판매 금액" value={formatKrw(totalRevenue)} />
        <StatCard
          label="실수령 합계"
          value={formatKrw(totalNet)}
          valueClassName="text-blue-700"
        />
      </StatGrid>

      <SalesForm products={products} retailers={retailers} />

      <PageSection title="판매 이력">
        <SalesTable records={records} />
      </PageSection>
    </PageShell>
  );
}
