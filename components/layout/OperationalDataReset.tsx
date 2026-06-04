"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { actionClearOperationalData } from "@/app/actions";

export function OperationalDataReset() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleReset() {
    if (!confirmed) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await actionClearOperationalData();
      setMessage(
        `삭제 완료: 구매 ${result.purchasesDeleted}건, 판매 ${result.salesDeleted}건`,
      );
      setConfirmed(false);
      router.refresh();
    } catch {
      setMessage("삭제에 실패했습니다. Supabase 연결을 확인하세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/80 p-5">
      <h3 className="text-sm font-semibold text-red-900">운영 데이터 초기화</h3>
      <p className="mt-1 text-xs text-red-800/90">
        구매 이력, 재고(집계), 판매 이력, 마진(집계)가 모두 삭제됩니다. 제품·쇼핑몰·몰
        가격(리스팅)은 유지됩니다.
      </p>
      <label className="mt-3 flex items-center gap-2 text-xs text-red-900">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="rounded border-red-300"
        />
        위 내용을 확인했으며 전체 삭제에 동의합니다
      </label>
      <button
        type="button"
        disabled={!confirmed || pending}
        onClick={handleReset}
        className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "삭제 중…" : "구매·판매 이력 전체 삭제"}
      </button>
      {message && (
        <p className="mt-2 text-xs font-medium text-red-900">{message}</p>
      )}
    </div>
  );
}
