import type { RepricingHoldReason } from "@/lib/repricing/types";

const DEFAULT_REQUIRED_PERSISTENCE_HOURS = 3;
const DEFAULT_MAX_DROP_RATIO = 0.1;

export interface DecideRepriceInput {
  currentPrice: number;
  targetPrice: number;
  deadZoneWon: number;
  bepPrice: number;
  /** 목표가-현재가 갭이 dead zone을 넘긴 상태가 지속된 시간(시간 단위) */
  persistenceHours: number;
  requiredPersistenceHours?: number;
  maxDropRatio?: number;
}

export type RepriceDecision =
  | { action: "no_change"; reason: "within_dead_zone" | "insufficient_persistence" }
  | {
      action: "reprice";
      newPrice: number;
      triggerReason: "dead_zone_exceeded" | "persistence_confirmed";
      /** true면 BEP 미만이라 자동 적용 불가 — Telegram 승인 필요 */
      requiresApproval: boolean;
    };

/**
 * 리프라이싱 판정: dead zone → 지속성 필터(즉시반응 예외 포함) → 하드캡(-10%) → BEP 플로어가드.
 */
export function decideReprice(input: DecideRepriceInput): RepriceDecision {
  const gap = input.currentPrice - input.targetPrice;
  const absGap = Math.abs(gap);

  if (absGap <= input.deadZoneWon) {
    return { action: "no_change", reason: "within_dead_zone" };
  }

  const isImmediateException = absGap > input.deadZoneWon * 2;
  const requiredHours = input.requiredPersistenceHours ?? DEFAULT_REQUIRED_PERSISTENCE_HOURS;

  if (!isImmediateException && input.persistenceHours < requiredHours) {
    return { action: "no_change", reason: "insufficient_persistence" };
  }

  let newPrice = input.targetPrice;
  if (newPrice < input.currentPrice) {
    const maxDropRatio = input.maxDropRatio ?? DEFAULT_MAX_DROP_RATIO;
    const minAllowedByCap = Math.ceil(input.currentPrice * (1 - maxDropRatio));
    newPrice = Math.max(newPrice, minAllowedByCap);
  }

  return {
    action: "reprice",
    newPrice,
    triggerReason: isImmediateException ? "dead_zone_exceeded" : "persistence_confirmed",
    requiresApproval: newPrice < input.bepPrice,
  };
}

export interface LatestMonitoringSnapshot {
  marketLowestPrice: number | null;
  isSoonOutOfStock: boolean;
}

export interface HoldStateInput {
  now: Date;
  currentHoldReason: RepricingHoldReason | null;
  currentHoldUntil: string | null;
  holdRecheckHours: number;
  latestLog: LatestMonitoringSnapshot | null;
}

export interface HoldStateResult {
  holdReason: RepricingHoldReason | null;
  holdUntil: string | null;
  /** 이번 평가에서 hold 상태가 시작되거나(진입) 해제되었는지 */
  changed: boolean;
}

function extendHoldUntil(now: Date, holdRecheckHours: number): string {
  return new Date(now.getTime() + holdRecheckHours * 60 * 60 * 1000).toISOString();
}

/**
 * 품절임박 경쟁사 hold 상태 평가.
 * 최신 스냅샷이 "시장최저가 있음 + 품절임박(수동 확인)"을 계속 확인해줄 때만 hold 유지.
 * 경쟁사가 사라지거나(품절 확정) 플래그가 풀리면(재입고 등) 즉시 해제.
 */
export function evaluateSoonOutOfStockHold(input: HoldStateInput): HoldStateResult {
  const latestConfirmsHold =
    input.latestLog != null &&
    input.latestLog.marketLowestPrice != null &&
    input.latestLog.isSoonOutOfStock === true;

  const isCurrentlyHeld = input.currentHoldReason === "competitor_soon_out_of_stock";

  if (!isCurrentlyHeld) {
    if (!latestConfirmsHold) {
      return { holdReason: null, holdUntil: null, changed: false };
    }
    return {
      holdReason: "competitor_soon_out_of_stock",
      holdUntil: extendHoldUntil(input.now, input.holdRecheckHours),
      changed: true,
    };
  }

  if (!latestConfirmsHold) {
    return { holdReason: null, holdUntil: null, changed: true };
  }

  const recheckDue =
    input.currentHoldUntil != null && input.now >= new Date(input.currentHoldUntil);

  return {
    holdReason: "competitor_soon_out_of_stock",
    holdUntil: recheckDue
      ? extendHoldUntil(input.now, input.holdRecheckHours)
      : input.currentHoldUntil,
    changed: false,
  };
}
