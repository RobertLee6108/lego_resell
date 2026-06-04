"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "카탈로그" },
  { href: "/purchases", label: "구매 이력" },
  { href: "/inventory", label: "재고" },
  { href: "/sales", label: "판매" },
  { href: "/margin", label: "마진" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="shrink-0 text-base font-bold tracking-tight text-zinc-900">
          레고 리셀
        </Link>
        <nav className="flex gap-1">
          {NAV.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <span className="ml-auto text-xs text-zinc-400">KRW</span>
      </div>
    </header>
  );
}
