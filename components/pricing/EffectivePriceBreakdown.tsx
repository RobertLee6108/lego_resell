"use client";

import { formatKrw } from "@/lib/format";
import type { PriceBreakdown } from "@/lib/pricing/types";

interface EffectivePriceBreakdownProps {
  breakdown: PriceBreakdown;
  retailerName: string;
}

export function EffectivePriceBreakdown({
  breakdown,
  retailerName,
}: EffectivePriceBreakdownProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
      <h4 className="mb-3 font-semibold text-zinc-800">{retailerName} · 계산 단계</h4>
      <ol className="space-y-2">
        {breakdown.steps.map((step, i) => (
          <li key={i} className="flex justify-between gap-4 border-b border-zinc-200/80 pb-2 last:border-0">
            <span className="text-zinc-600">
              {"label" in step && step.label
                ? step.label
                : step.step}
              {"percent" in step && step.percent != null
                ? ` (${step.percent}%)`
                : null}
            </span>
            <span className="shrink-0 font-mono text-zinc-900">
              {"deduction" in step && step.deduction != null
                ? `−${formatKrw(step.deduction)}`
                : "amount" in step
                  ? formatKrw(step.amount)
                  : "remaining" in step
                    ? formatKrw(step.remaining)
                    : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
