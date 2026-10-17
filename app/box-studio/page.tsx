"use client";

import dynamic from "next/dynamic";

const Studio = dynamic(
  () => import("@/components/box-studio/Studio").then((mod) => mod.Studio),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0c0c0e] text-sm text-zinc-400">
        박스 스튜디오 로딩 중...
      </div>
    ),
  }
);

export default function BoxStudioPage() {
  return (
    <div className="fixed inset-x-0 top-14 bottom-0 z-10 flex flex-col overflow-hidden bg-[#0c0c0e]">
      <Studio />
    </div>
  );
}