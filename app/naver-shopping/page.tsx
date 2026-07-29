import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { PageShell } from "@/components/layout/PageShell";
import { NaverShoppingSearchForm } from "@/components/naver-shopping/NaverShoppingSearchForm";
import { NaverShoppingWatchTargets } from "@/components/naver-shopping/NaverShoppingWatchTargets";
import {
  getNaverShoppingProducts,
  getNaverShoppingWatchTargets,
  getRecentNaverShoppingRuns,
} from "@/lib/data/naver-shopping";

export const dynamic = "force-dynamic";

function RecentRuns({
  runs,
}: {
  runs: Awaited<ReturnType<typeof getRecentNaverShoppingRuns>>;
}) {
  if (runs.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
        저장된 검색 결과가 없습니다.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <ul className="space-y-2 text-sm">
        {runs.map((run) => (
          <li
            key={run.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-b-0 last:pb-0"
          >
            <span className="text-zinc-800">{run.queries.join(", ")}</span>
            <span className="text-xs text-zinc-500">
              {run.sort} · {run.display}개 · 총 {run.total.toLocaleString("ko-KR")}건
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function NaverShoppingPage() {
  const products = await getNaverShoppingProducts();

  const [targets, recentRuns] = await Promise.all([
    getNaverShoppingWatchTargets(),
    getRecentNaverShoppingRuns(),
  ]);

  const savedKeywords = [
    ...targets.map((target) => target.keyword),
    ...recentRuns.flatMap((run) => run.queries),
  ];

  return (
    <PageShell>
      <PageHeader
        title="네이버 상품 검색"
        description="네이버 쇼핑 검색으로 레고 상품 최저가를 확인하고 검색 결과를 저장합니다."
      />

      <PageSection title="수동 검색">
        <NaverShoppingSearchForm
          products={products}
          savedKeywords={savedKeywords}
          isLoggedIn={true}
        />
      </PageSection>

      <PageSection title="관심 제품·키워드 배치">
        <NaverShoppingWatchTargets products={products} targets={targets} />
      </PageSection>

      <PageSection title="최근 저장 검색">
        <RecentRuns runs={recentRuns} />
      </PageSection>
    </PageShell>
  );
}
