"use client";

import { useTransition } from "react";
import { actionSignOut } from "@/app/login/actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => actionSignOut())}
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-60"
    >
      {pending ? "로그아웃…" : "로그아웃"}
    </button>
  );
}
