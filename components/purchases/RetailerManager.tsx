"use client";

import { useActionState } from "react";
import {
  actionAddRetailer,
  actionDeleteRetailer,
} from "@/app/purchases/actions";
import { formInputClass } from "@/components/ui/formStyles";
import type { RetailerOption } from "@/lib/retailers/types";

interface RetailerManagerProps {
  retailers: RetailerOption[];
}

export function RetailerManager({ retailers }: RetailerManagerProps) {
  const [, addAction, addPending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionAddRetailer(formData);
      return null;
    },
    null,
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
      <p className="mb-2 text-xs font-medium text-zinc-600">쇼핑몰 관리</p>
      <form action={addAction} className="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          name="name"
          required
          placeholder="새 쇼핑몰 이름"
          className={`min-w-[140px] flex-1 ${formInputClass}`}
        />
        <button
          type="submit"
          disabled={addPending}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-50"
        >
          {addPending ? "추가 중…" : "쇼핑몰 추가"}
        </button>
      </form>
      {retailers.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {retailers.map((r) => (
            <li
              key={r.id}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs"
            >
              <span className="text-zinc-700">{r.name}</span>
              <form action={actionDeleteRetailer}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  className="text-red-500 hover:underline"
                  title={`${r.name} 삭제`}
                >
                  삭제
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
