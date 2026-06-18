"use client";

import { useActionState, useState } from "react";
import { actionSignIn, type LoginActionState } from "@/app/login/actions";
import { formInputClass } from "@/components/ui/formStyles";

interface LoginFormProps {
  redirectTo: string;
}

const initialState: LoginActionState = { error: null };

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, action, pending] = useActionState(actionSignIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="rounded-xl border border-zinc-200 bg-white p-6">
      <input type="hidden" name="redirect" value={redirectTo} />

      <div className="space-y-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          이메일
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="tester1@happytomato.net"
            className={formInputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          비밀번호
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              autoComplete="current-password"
              placeholder="Test1234!"
              className={`${formInputClass} w-full pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-zinc-500 transition hover:text-zinc-800"
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {showPassword ? "숨기기" : "보기"}
            </button>
          </div>
        </label>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "로그인 중…" : "로그인"}
        </button>
      </div>
    </form>
  );
}
