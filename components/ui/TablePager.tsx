"use client";

import { formSelectClass } from "@/components/ui/formStyles";

export type PageSizeOption = 5 | 10;

interface TablePagerProps {
  total: number;
  page: number;
  pageSize: PageSizeOption;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
}

export function TablePager({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TablePagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
      <label className="flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">보기</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value) as PageSizeOption);
            onPageChange(1);
          }}
          className={formSelectClass}
          aria-label="페이지당 행 수"
        >
          <option value={5}>5개</option>
          <option value={10}>10개</option>
        </select>
      </label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">
          {total === 0 ? "0건" : `${start}–${end} / ${total}건`}
        </span>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
}

export function paginateSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
