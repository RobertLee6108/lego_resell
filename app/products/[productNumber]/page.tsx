import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceComparisonDashboard } from "@/components/pricing/PriceComparisonDashboard";
import { getProductDetail } from "@/lib/data/product-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ productNumber: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { productNumber } = await params;

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <p className="text-sm text-zinc-600">
        <Link href="/" className="text-emerald-700 underline">
          홈
        </Link>
        으로 돌아가세요. Supabase 환경 변수를 설정해 주세요.
      </p>
    );
  }

  let product;
  try {
    product = await getProductDetail(productNumber);
  } catch {
    notFound();
  }

  if (!product) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="inline-block text-sm text-emerald-700 hover:underline"
      >
        ← 카탈로그
      </Link>
      <PriceComparisonDashboard
        productNumber={product.productNumber}
        name={product.name}
        msrp={product.msrp}
        status={product.status}
        releaseDate={product.releaseDate}
        themeName={product.themeName}
        listings={product.listings}
      />
    </div>
  );
}
