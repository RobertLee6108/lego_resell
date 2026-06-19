"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";

const NAV = [
  { href: "/", label: "카탈로그" },
  { href: "/purchases", label: "구매 이력" },
  { href: "/inventory", label: "재고" },
  { href: "/sales", label: "판매" },
  { href: "/margin", label: "마진" },
  { href: "/naver-shopping", label: "네이버 검색" },
];

interface HeaderProps {
  userEmail?: string | null;
}

export function Header({ userEmail }: HeaderProps) {
  const pathname = usePathname();
  const isLoggedIn = Boolean(userEmail);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="shrink-0 text-base font-bold tracking-tight text-zinc-900">
          레고 리셀
        </Link>
        <nav className="flex gap-1">
          {(isLoggedIn
            ? NAV
            : NAV.filter(({ href }) => href === "/naver-shopping")
          ).map(({ href, label }) => {
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
        <div className="ml-auto flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="hidden text-xs text-zinc-500 sm:inline">{userEmail}</span>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
            >
              로그인
            </Link>
          )}
          <span className="text-xs text-zinc-400">KRW</span>
        </div>
      </div>
    </header>
  );
}
