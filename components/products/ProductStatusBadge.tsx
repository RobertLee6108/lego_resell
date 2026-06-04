import type { ProductStatus } from "@/lib/pricing/types";

const LABELS: Record<ProductStatus, string> = {
  on_sale: "발매중",
  retiring_soon: "단종예정",
  discontinued: "단종",
};

const STYLES: Record<ProductStatus, string> = {
  on_sale: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  retiring_soon: "bg-amber-50 text-amber-800 ring-amber-600/20",
  discontinued: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
