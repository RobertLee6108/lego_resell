import { LoginForm } from "@/components/auth/LoginForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect: redirectTo } = await searchParams;
  const safeRedirect = redirectTo?.startsWith("/") ? redirectTo : "/";

  return (
    <PageShell>
      <PageHeader
        title="로그인"
        description="레고 리셀 관리 도구에 접속하려면 계정으로 로그인하세요."
      />
      <div className="mx-auto max-w-sm">
        <LoginForm redirectTo={safeRedirect} />
      </div>
      <p className="text-center text-xs text-zinc-500">
        tester1@happytomato.net · 비밀번호 Test1234!
        <br />
        <code className="text-zinc-400">@lego-resell.local</code> 은 Supabase에서 거부됩니다.{" "}
        <strong>@happytomato.net</strong> 으로 계정을 만드세요.
      </p>
    </PageShell>
  );
}
