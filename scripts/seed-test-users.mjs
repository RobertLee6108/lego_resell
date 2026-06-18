/**
 * 로컬/원격 Supabase에 테스트 계정 5개 생성.
 * 사용: node scripts/seed-test-users.mjs
 * 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local)
 */
import { createClient } from "@supabase/supabase-js";
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
    if (!value) continue;
    process.env[key] = value;
  }
}

// .env.local → .dev.vars 순 (나중 파일이 URL 등 덮어씀)
loadEnvFile(".env.local");
loadEnvFile(".dev.vars");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.\n" +
      "로컬: npx supabase start 후 .env.local 에 Secret 키\n" +
      "원격: .dev.vars 에 URL, .env.local 에 service_role secret 키\n" +
      "  (Supabase 대시보드 → API Keys → Legacy → service_role secret)",
  );
  process.exit(1);
}

const isRemote = !url.includes("127.0.0.1") && !url.includes("localhost");

console.log(`대상: ${url}`);

if (!isRemote) {
  console.warn("⚠  로컬 Supabase URL입니다. npx supabase start 가 실행 중인지 확인하세요.");
}

// 로컬 `npx supabase status` Secret 키는 원격 프로젝트에서 Invalid API key 발생
if (isRemote && serviceRoleKey.startsWith("sb_secret_N7UND")) {
  console.error(
    "✗  로컬 Supabase Secret 키를 원격 URL에 쓰고 있습니다.\n" +
      "   Supabase 대시보드 → API Keys → Legacy → service_role secret 을\n" +
      "   .env.local 의 SUPABASE_SERVICE_ROLE_KEY 에 넣으세요.",
  );
  process.exit(1);
}

// .local 도메인은 Supabase Auth에서 invalid email 처리됨 → 실제 도메인 사용
const TEST_USERS = [
  { email: "tester1@happytomato.net", password: "Test1234!", label: "테스터 1" },
  { email: "tester2@happytomato.net", password: "Test1234!", label: "테스터 2" },
  { email: "tester3@happytomato.net", password: "Test1234!", label: "테스터 3" },
  { email: "tester4@happytomato.net", password: "Test1234!", label: "테스터 4" },
  { email: "tester5@happytomato.net", password: "Test1234!", label: "테스터 5" },
];

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let created = 0;
let skipped = 0;

for (const { email, password, label } of TEST_USERS) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: label },
  });

  if (error) {
    const alreadyExists =
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered");
    if (alreadyExists) {
      console.log(`⏭  ${email} — 이미 존재 (${label})`);
      skipped += 1;
      continue;
    }
    console.error(`✗  ${email} — ${error.message}`);
    process.exit(1);
  }

  console.log(`✓  ${email} — 생성됨 (${label}, id: ${data.user.id})`);
  created += 1;
}

console.log(`\n완료: ${created}개 생성, ${skipped}개 건너뜀`);
console.log("공통 비밀번호: Test1234!");
