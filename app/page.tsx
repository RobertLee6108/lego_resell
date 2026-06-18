import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { CatalogGrid } from "@/components/products/CatalogGrid";
import { ProductForm } from "@/components/products/ProductForm";
import { getCatalogProducts, getThemes } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

function SetupNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
      <p className="font-semibold">Supabase 연결 필요</p>
      <p className="mt-2">
        <code className="rounded bg-amber-100 px-1">.env.local.example</code>을
        복사해 URL·Anon Key를 설정한 뒤, Docker에서{" "}
        <code className="rounded bg-amber-100 px-1">npx supabase db reset</code>
        으로 마이그레이션·시드를 적용하세요.
      </p>
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; status?: string }>;
}) {
  const params = await searchParams;

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return <SetupNotice />;
  }

  try {
    const [themes, products] = await Promise.all([
      getThemes(),
      getCatalogProducts({
        themeId: params.theme,
        status: params.status as "on_sale" | "retiring_soon" | "discontinued" | undefined,
      }),
    ]);

    const themeOptions = themes.map((t) => ({
      value: t.id,
      label: t.name,
    }));

    return (
      <PageShell>
        <PageHeader
          title="제품 카탈로그"
          description="레고 세트를 테마별로 관리합니다. 몰별 가격은 제품 상세에서 확인합니다."
        />
        <ProductForm themes={themeOptions} />
        <CatalogGrid
          products={products}
          themes={themeOptions}
          initialThemeId={params.theme ?? ""}
          initialStatus={params.status ?? ""}
        />
      </PageShell>
    );
  } catch (e) {
    console.error(e);
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        데이터를 불러오지 못했습니다. Supabase가 실행 중인지 확인하세요.
      </div>
    );
  }
}
