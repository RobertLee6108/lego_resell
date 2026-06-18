import * as XLSX from "xlsx";
import {
  EXCLUDED_CATEGORIES,
  EXCLUDED_SETTLEMENT_STATUSES,
  NAVER_COLUMN_ALIASES,
} from "@/lib/sales/naverSettlementColumns";
import type {
  NaverParseError,
  NaverParsedRow,
  NaverParseResult,
} from "@/lib/sales/naverSettlementTypes";

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "");
}

function buildHeaderMap(headers: string[]): Map<string, number> {
  const aliasToField = new Map<string, string>();
  for (const [field, aliases] of Object.entries(NAVER_COLUMN_ALIASES)) {
    for (const alias of aliases) {
      aliasToField.set(normalizeHeader(alias), field);
    }
  }

  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    const field = aliasToField.get(normalizeHeader(header));
    if (field && !map.has(field)) {
      map.set(field, index);
    }
  });
  return map;
}

function cellValue(row: unknown[], index: number | undefined): string {
  if (index === undefined) return "";
  const value = row[index];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseAmount(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[,원\s]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function parseQuantity(value: string): number {
  const n = parseAmount(value);
  if (n === null || n <= 0) return 1;
  return n;
}

function sheetToMatrix(workbook: XLSX.WorkBook): string[][] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  return raw.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : [],
  );
}

function parseCsvText(text: string): string[][] {
  const workbook = XLSX.read(text, { type: "string", raw: false });
  return sheetToMatrix(workbook);
}

function parseXlsxBuffer(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  return sheetToMatrix(workbook);
}

function shouldSkipRow(
  category: string,
  settlementStatus: string,
): { skip: boolean; reason?: string } {
  if (category) {
    const normalized = category.replace(/\s+/g, "");
    if (EXCLUDED_CATEGORIES.has(normalized)) {
      return { skip: true, reason: `구분 제외: ${category}` };
    }
  }

  if (settlementStatus) {
    const status = settlementStatus.replace(/\s+/g, "");
    for (const excluded of EXCLUDED_SETTLEMENT_STATUSES) {
      if (status.includes(excluded.replace(/\s+/g, ""))) {
        return { skip: true, reason: `정산상태 제외: ${settlementStatus}` };
      }
    }
  }

  return { skip: false };
}

function parseMatrix(matrix: string[][]): NaverParseResult {
  const errors: NaverParseError[] = [];
  const rows: NaverParsedRow[] = [];
  let skipped = 0;

  if (matrix.length < 2) {
    return {
      rows: [],
      errors: [{ rowIndex: 0, message: "헤더 또는 데이터 행이 없습니다." }],
      skipped: 0,
    };
  }

  const headerRow = matrix[0];
  const headerMap = buildHeaderMap(headerRow);

  if (!headerMap.has("external_order_id") && !headerMap.has("order_id")) {
    return {
      rows: [],
      errors: [
        {
          rowIndex: 0,
          message: "상품주문번호 또는 주문번호 컬럼을 찾을 수 없습니다.",
        },
      ],
      skipped: 0,
    };
  }

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i];
    if (line.every((cell) => !cell)) continue;

    const category = cellValue(line, headerMap.get("category"));
    const settlementStatus = cellValue(line, headerMap.get("settlement_status"));
    const skipCheck = shouldSkipRow(category, settlementStatus);
    if (skipCheck.skip) {
      skipped++;
      continue;
    }

    const externalOrderId =
      cellValue(line, headerMap.get("external_order_id")) ||
      cellValue(line, headerMap.get("order_id"));

    const paymentAmount = parseAmount(cellValue(line, headerMap.get("payment_amount")));
    const feeRaw = cellValue(line, headerMap.get("fee_amount"));
    const feeAmount = parseAmount(feeRaw) ?? 0;

    if (!externalOrderId) {
      errors.push({ rowIndex: i + 1, message: "상품주문번호가 없습니다." });
      continue;
    }

    if (paymentAmount === null || paymentAmount <= 0) {
      errors.push({
        rowIndex: i + 1,
        message: `결제금액이 유효하지 않습니다 (${externalOrderId}).`,
      });
      continue;
    }

    rows.push({
      rowIndex: i + 1,
      external_order_id: externalOrderId,
      order_id: cellValue(line, headerMap.get("order_id")) || null,
      seller_product_code:
        cellValue(line, headerMap.get("seller_product_code")) || null,
      option_manage_code:
        cellValue(line, headerMap.get("option_manage_code")) || null,
      product_name: cellValue(line, headerMap.get("product_name")) || null,
      quantity: parseQuantity(cellValue(line, headerMap.get("quantity"))),
      payment_amount: paymentAmount,
      fee_amount: feeAmount,
      payment_date: cellValue(line, headerMap.get("payment_date")) || null,
      settlement_date: cellValue(line, headerMap.get("settlement_date")) || null,
      purchase_confirm_date:
        cellValue(line, headerMap.get("purchase_confirm_date")) || null,
    });
  }

  return { rows, errors, skipped };
}

export async function parseNaverSettlementFile(
  file: File,
): Promise<NaverParseResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    return parseMatrix(parseXlsxBuffer(buffer));
  }

  if (name.endsWith(".csv")) {
    const text = await file.text();
    return parseMatrix(parseCsvText(text));
  }

  return {
    rows: [],
    errors: [{ rowIndex: 0, message: "CSV 또는 XLSX 파일만 지원합니다." }],
    skipped: 0,
  };
}
