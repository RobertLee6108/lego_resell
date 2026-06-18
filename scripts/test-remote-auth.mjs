/**
 * 원격 Supabase 로그인 API 테스트 + 실패 시 Auth Logs 확인 안내
 * 사용: node scripts/test-remote-auth.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename) {
  const envPath = resolve(process.cwd(), filename);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (value) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".dev.vars");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 필요 (.dev.vars 확인)");
  process.exit(1);
}

console.log("Supabase URL:", url);
console.log("");

const cases = [
  ["tester1@happytomato.net", "Test1234!", "정상 계정"],
  ["tester1@happytomato.net", "wrongpass", "잘못된 비밀번호"],
  ["ghost@happytomato.net", "Test1234!", "없는 계정"],
];

for (const [email, password, label] of cases) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  const ok = res.ok;
  console.log(`${ok ? "✓" : "✗"} [${label}] ${email}`);
  console.log(`   HTTP ${res.status} · ${body.error_code ?? "success"}`);
  if (!ok) console.log(`   msg: ${body.msg ?? body.error_description ?? "-"}`);
}

console.log(`
── Supabase 로그 확인 ──
실패 로그는 사용자 상세 탭이 아니라 프로젝트 Auth Logs 에 남습니다:
https://supabase.com/dashboard/project/wfrusrhqxcwenzjqmulc/logs/auth-logs

위 테스트 직후 새로고침 → path /token, status 400 또는 200 검색

── 앱(Worker) 로그 ──
happytomato.net 로그인 실패는 배포 후:
npx wrangler tail legoresell
`);
