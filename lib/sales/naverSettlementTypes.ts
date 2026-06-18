import type { SoldAtField } from "@/lib/sales/naverSettlementColumns";

export interface NaverParsedRow {
  rowIndex: number;
  external_order_id: string;
  order_id: string | null;
  seller_product_code: string | null;
  option_manage_code: string | null;
  product_name: string | null;
  quantity: number;
  payment_amount: number;
  fee_amount: number;
  payment_date: string | null;
  settlement_date: string | null;
  purchase_confirm_date: string | null;
}

export interface NaverParseError {
  rowIndex: number;
  message: string;
}

export interface NaverParseResult {
  rows: NaverParsedRow[];
  errors: NaverParseError[];
  skipped: number;
}

export type NaverPreviewStatus =
  | "ready"
  | "unmatched"
  | "duplicate"
  | "error";

export interface NaverPreviewRow {
  rowIndex: number;
  external_order_id: string;
  product_name: string | null;
  payment_amount: number;
  fee_amount: number;
  platform_fee_rate: number;
  quantity: number;
  unit_sale_price: number;
  sold_at: string;
  product_number: string | null;
  match_source: "seller_code" | "option_code" | "manual" | null;
  status: NaverPreviewStatus;
  error_message: string | null;
  memo: string;
}

export interface NaverImportRow {
  external_order_id: string;
  product_number: string;
  sold_at: string;
  quantity: number;
  unit_sale_price: number;
  platform_fee_rate: number;
  memo: string;
}

export interface NaverImportResult {
  inserted: number;
  skipped_duplicate: number;
  skipped_invalid: number;
  errors: string[];
}

export function resolveSoldAt(
  row: NaverParsedRow,
  field: SoldAtField,
): string | null {
  const raw =
    field === "payment"
      ? row.payment_date
      : field === "settlement"
        ? row.settlement_date
        : row.purchase_confirm_date;
  return raw ? normalizeDate(raw) : null;
}

export function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dotted = trimmed.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (dotted) {
    const m = dotted[2].padStart(2, "0");
    const d = dotted[3].padStart(2, "0");
    return `${dotted[1]}-${m}-${d}`;
  }

  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

export function calcPlatformFeeRate(
  paymentAmount: number,
  feeAmount: number,
): number {
  if (paymentAmount <= 0) return 0;
  return Math.round((feeAmount / paymentAmount) * 10000) / 100;
}

export function buildMemo(externalOrderId: string, productName: string | null): string {
  const name = productName?.trim();
  if (name) {
    return `네이버정산 ${externalOrderId} · ${name}`;
  }
  return `네이버정산 ${externalOrderId}`;
}
