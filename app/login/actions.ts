"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginActionState = {
  error: string | null;
};

export async function actionSignIn(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) || "/";

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[auth] signIn failed", {
      email,
      code: error.code,
      message: error.message,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "이메일 인증이 필요합니다. Supabase에서 사용자를 Auto Confirm으로 다시 만드세요." };
    }
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function actionSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
