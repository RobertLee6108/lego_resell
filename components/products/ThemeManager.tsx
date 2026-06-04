"use client";

import { useActionState } from "react";
import { actionAddTheme, actionDeleteTheme } from "@/app/actions";
import { formInputClass } from "@/components/ui/formStyles";

export interface ThemeOption {
  value: string;
  label: string;
}

interface ThemeManagerProps {
  themes: ThemeOption[];
}

export function ThemeManager({ themes }: ThemeManagerProps) {
  const [, addAction, addPending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await actionAddTheme(formData);
      return null;
    },
    null,
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
      <p className="mb-2 text-xs font-medium text-zinc-600">테마 관리</p>
      <form action={addAction} className="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          name="name"
          required
          placeholder="새 테마 이름"
          className={`min-w-[140px] flex-1 ${formInputClass}`}
        />
        <button
          type="submit"
          disabled={addPending}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-50"
        >
          {addPending ? "추가 중…" : "테마 추가"}
        </button>
      </form>
      {themes.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <li
              key={t.value}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs"
            >
              <span className="text-zinc-700">{t.label}</span>
              <form action={actionDeleteTheme}>
                <input type="hidden" name="id" value={t.value} />
                <button
                  type="submit"
                  className="text-red-500 hover:underline"
                  title={`${t.label} 삭제`}
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
