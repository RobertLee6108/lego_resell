"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  actionGetNaverExistingOrderIds,
  actionImportNaverSettlement,
} from "@/app/sales/actions";
import { formInputClass, formSelectClass } from "@/components/ui/formStyles";
import { formatKrw, formatDate } from "@/lib/format";
import { mapNaverSettlementRows } from "@/lib/sales/mapNaverSettlementRows";
import {
  SOLD_AT_FIELD_LABELS,
  type SoldAtField,
} from "@/lib/sales/naverSettlementColumns";
import type {
  NaverImportResult,
  NaverParsedRow,
  NaverPreviewRow,
} from "@/lib/sales/naverSettlementTypes";
import { parseNaverSettlementFile } from "@/lib/sales/parseNaverSettlement";

interface Product {
  product_number: string;
  name: string;
}

interface NaverSettlementImportProps {
  products: Product[];
}

type Step = "upload" | "preview" | "result";

const STATUS_LABELS: Record<NaverPreviewRow["status"], string> = {
  ready: "신규",
  unmatched: "제품 미매칭",
  duplicate: "중복",
  error: "오류",
};

const STATUS_CLASS: Record<NaverPreviewRow["status"], string> = {
  ready: "text-emerald-700",
  unmatched: "text-amber-700",
  duplicate: "text-zinc-500",
  error: "text-red-600",
};

export function NaverSettlementImport({ products }: NaverSettlementImportProps) {
  const [step, setStep] = useState<Step>("upload");
  const [soldAtField, setSoldAtField] = useState<SoldAtField>("payment");
  const [parsedRows, setParsedRows] = useState<NaverParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<NaverPreviewRow[]>([]);
  const [manualMappings, setManualMappings] = useState<Record<number, string>>(
    {},
  );
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<NaverImportResult | null>(
    null,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshPreview = useCallback(
    async (
      rows: NaverParsedRow[],
      field: SoldAtField,
      mappings: Record<number, string>,
    ) => {
      const externalIds = rows.map((r) => r.external_order_id);
      const existing = await actionGetNaverExistingOrderIds(externalIds);
      const existingSet = new Set(existing);
      const mapped = mapNaverSettlementRows(
        rows,
        products,
        field,
        existingSet,
        mappings,
      );
      setPreviewRows(mapped);
      setSelectedRows(
        new Set(
          mapped
            .filter((r) => r.status === "ready")
            .map((r) => r.rowIndex),
        ),
      );
    },
    [products],
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const result = await parseNaverSettlementFile(file);

    if (result.errors.length > 0 && result.rows.length === 0) {
      setFileError(result.errors.map((err) => err.message).join(" "));
      return;
    }

    setParsedRows(result.rows);
    setParseErrors(result.errors.map((err) => `${err.rowIndex}행: ${err.message}`));
    setSkippedCount(result.skipped);
    setManualMappings({});
    setStep("preview");
    await refreshPreview(result.rows, soldAtField, {});
  }

  function handleSoldAtFieldChange(field: SoldAtField) {
    setSoldAtField(field);
    if (parsedRows.length > 0) {
      void refreshPreview(parsedRows, field, manualMappings);
    }
  }

  function handleManualMapping(rowIndex: number, productNumber: string) {
    const next = { ...manualMappings, [rowIndex]: productNumber };
    setManualMappings(next);
    void refreshPreview(parsedRows, soldAtField, next);
  }

  function toggleRow(rowIndex: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  function toggleAllReady(checked: boolean) {
    if (checked) {
      setSelectedRows(
        new Set(
          previewRows
            .filter((r) => r.status === "ready")
            .map((r) => r.rowIndex),
        ),
      );
    } else {
      setSelectedRows(new Set());
    }
  }

  const readyCount = useMemo(
    () => previewRows.filter((r) => r.status === "ready").length,
    [previewRows],
  );

  function handleImport() {
    const rowsToImport = previewRows
      .filter((r) => selectedRows.has(r.rowIndex) && r.status === "ready")
      .map((r) => ({
        external_order_id: r.external_order_id,
        product_number: r.product_number!,
        sold_at: r.sold_at,
        quantity: r.quantity,
        unit_sale_price: r.unit_sale_price,
        platform_fee_rate: r.platform_fee_rate,
        memo: r.memo,
      }));

    startTransition(async () => {
      const result = await actionImportNaverSettlement(rowsToImport);
      setImportResult(result);
      setStep("result");
    });
  }

  function reset() {
    setStep("upload");
    setParsedRows([]);
    setParseErrors([]);
    setSkippedCount(0);
    setPreviewRows([]);
    setManualMappings({});
    setSelectedRows(new Set());
    setImportResult(null);
    setFileError(null);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-zinc-800">
          네이버 스마트스토어 정산 가져오기
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          정산관리 → 정산 내역(일별/건별) → 건별 정산내역에서 엑셀/CSV를
          다운로드한 뒤 업로드하세요. 판매자상품코드가 제품번호와 같으면 자동
          매칭됩니다.
        </p>
      </div>

      {step === "upload" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            판매일 기준
            <select
              value={soldAtField}
              onChange={(e) =>
                handleSoldAtFieldChange(e.target.value as SoldAtField)
              }
              className={formSelectClass}
            >
              {(Object.keys(SOLD_AT_FIELD_LABELS) as SoldAtField[]).map(
                (key) => (
                  <option key={key} value={key}>
                    {SOLD_AT_FIELD_LABELS[key]}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            정산 파일 (CSV / XLSX)
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className={formInputClass}
            />
          </label>
          {fileError ? (
            <p className="text-sm text-red-600 sm:col-span-2">{fileError}</p>
          ) : null}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
            <span>파싱 {parsedRows.length}건</span>
            {skippedCount > 0 && <span>제외 {skippedCount}건</span>}
            {parseErrors.length > 0 && (
              <span className="text-amber-700">오류 {parseErrors.length}건</span>
            )}
            <span className="text-emerald-700">등록 가능 {readyCount}건</span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto text-zinc-500 underline"
            >
              다시 선택
            </button>
          </div>

          {parseErrors.length > 0 && (
            <ul className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              {parseErrors.slice(0, 5).map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
              {parseErrors.length > 5 && (
                <li>…외 {parseErrors.length - 5}건</li>
              )}
            </ul>
          )}

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={
                        readyCount > 0 &&
                        previewRows
                          .filter((r) => r.status === "ready")
                          .every((r) => selectedRows.has(r.rowIndex))
                      }
                      onChange={(e) => toggleAllReady(e.target.checked)}
                      aria-label="등록 가능 행 전체 선택"
                    />
                  </th>
                  <th className="px-3 py-2 text-left">상품주문번호</th>
                  <th className="px-3 py-2 text-left">상품명</th>
                  <th className="px-3 py-2 text-right">결제금액</th>
                  <th className="px-3 py-2 text-right">수수료</th>
                  <th className="px-3 py-2 text-left">판매일</th>
                  <th className="px-3 py-2 text-left">제품 매칭</th>
                  <th className="px-3 py-2 text-left">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {previewRows.map((row) => (
                  <tr key={row.rowIndex} className="hover:bg-zinc-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.rowIndex)}
                        disabled={row.status !== "ready"}
                        onChange={() => toggleRow(row.rowIndex)}
                        aria-label={`${row.external_order_id} 선택`}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.external_order_id}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {row.product_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatKrw(row.payment_amount)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-600">
                      −{formatKrw(row.fee_amount)}
                      <span className="ml-1 text-xs text-zinc-400">
                        ({row.platform_fee_rate}%)
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {row.sold_at ? formatDate(row.sold_at) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.status === "unmatched" ? (
                        <select
                          value={manualMappings[row.rowIndex] ?? ""}
                          onChange={(e) =>
                            handleManualMapping(row.rowIndex, e.target.value)
                          }
                          className={formSelectClass}
                        >
                          <option value="">제품 선택</option>
                          {products.map((p) => (
                            <option
                              key={p.product_number}
                              value={p.product_number}
                            >
                              {p.product_number} · {p.name}
                            </option>
                          ))}
                        </select>
                      ) : row.product_number ? (
                        <span className="font-mono text-xs">
                          {row.product_number}
                          {row.match_source && row.match_source !== "manual" && (
                            <span className="ml-1 text-zinc-400">
                              ({row.match_source === "seller_code"
                                ? "판매자코드"
                                : "옵션코드"}
                              )
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`px-3 py-2 text-xs ${STATUS_CLASS[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                      {row.error_message && (
                        <div className="text-zinc-500">{row.error_message}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled={pending || selectedRows.size === 0}
            onClick={handleImport}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {pending
              ? "저장 중…"
              : `선택 ${selectedRows.size}건 판매 이력에 반영`}
          </button>
        </div>
      )}

      {step === "result" && importResult && (
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-50 p-4 text-sm">
            <p className="font-medium text-zinc-800">가져오기 완료</p>
            <ul className="mt-2 space-y-1 text-zinc-600">
              <li>등록: {importResult.inserted}건</li>
              <li>중복 건너뜀: {importResult.skipped_duplicate}건</li>
              <li>유효하지 않음: {importResult.skipped_invalid}건</li>
            </ul>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600">
                {importResult.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            다른 파일 가져오기
          </button>
        </div>
      )}
    </div>
  );
}
