# 에이전트 코딩 지침 (레고 리셀 · pro)

**이 파일만을 기준으로 작업한다.** 대화 맥락·이전 구현 추측보다 이 문서와 저장소의 실제 코드가 우선이다.

작업 시작 전: 관련 `app/`, `lib/data/`, `components/`, `supabase/migrations/` 를 읽고 기존 패턴을 따른다.

---

## 1. 스택

| 항목 | 버전·도구 |
|------|-----------|
| 프레임워크 | Next.js 16 App Router, React 19 |
| DB | Supabase (PostgreSQL), `@supabase/ssr` |
| 스타일 | Tailwind CSS 4 |
| 언어 | TypeScript (strict) |
| 통화 | KRW, DB·UI 모두 **정수(원)** |

Next.js API는 학습 데이터를 믿지 말고 `node_modules/next/dist/docs/` 를 확인한다 (`AGENTS.md` 동일).

---

## 2. 도메인·라우트

| 경로 | 역할 | 데이터 소스 |
|------|------|-------------|
| `/` | 제품 카탈로그 (제품·테마 추가/삭제) | `products`, `themes`, `app/actions.ts` |
| `/products/[productNumber]` | 몰별 체감가 비교 | `lib/data/product-detail.ts` |
| `/purchases` | **구매 이력** (추가·삭제·전체 목록) | `sourcing_records`, `v_purchase_history` |
| `/inventory` | **재고 현황** + 품목별 매입 **수정** (행 펼침) | `v_inventory_summary`, `v_purchase_history` |
| `/sales` | 판매 이력 | `sales_records` |
| `/margin` | 마진 요약 | `v_margin_summary` |

- 구매 **추가·삭제** → `/purchases` 만.
- 구매 **수정** → `/inventory` 품목 행 펼침 (`PurchaseHistoryTable` `allowEdit` only).
- `/inventory` 에 구매 추가 폼·전체 삭제 UI 넣지 않는다.
- 헤더 네비: `components/layout/Header.tsx` 의 `NAV` 배열과 동기화.

---

## 3. 디렉터리 규칙

```
app/
  {route}/page.tsx          # Server Component, export const dynamic = "force-dynamic"
  {route}/actions.ts        # "use server", FormData → lib/data
components/
  {domain}/                 # UI만. DB 호출 금지 (Server Action 제외)
lib/
  data/{domain}.ts          # Supabase CRUD·조회 (createClient from server)
  {domain}/types.ts         # 도메인 타입·순수 계산 함수
  pricing/                  # 체감가 (DB 함수와 동기 유지)
  format.ts                 # formatKrw, formatDate
  supabase/client.ts | server.ts
supabase/migrations/        # 타임스탬프 접두 SQL, 기존 파일 수정 금지
types/database.ts           # supabase gen types (수동 편집 최소화)
```

**새 기능 추가 순서:** migration → `types/database.ts` 재생성 → `lib/{domain}/types.ts` → `lib/data/{domain}.ts` → `app/.../actions.ts` → `components/...` → `page.tsx`.

---

## 4. 데이터·비즈니스 규칙

### 4.1 구매 (`sourcing_records`)

| 컬럼 | 의미 |
|------|------|
| `unit_cost` | 매입 단가. **재고·마진 원가**에 사용 (필수) |
| `effective_price_paid` | 할인 반영 체감 단가 (선택). **구매 이력 표시·`total_effective_cost`만** |
| `retailer_id` | 쇼핑몰 FK (선택) |

뷰 `v_purchase_history`: `total_effective_cost = COALESCE(effective_price_paid, unit_cost) * quantity`.

재고 뷰 `v_inventory_summary`·마진은 **`unit_cost`만** 사용한다. 체감가를 원가에 반영하려면 별도 migration·뷰 수정이 필요함을 문서화하고 임의로 섞지 않는다.

### 4.2 체감가 (카탈로그·리스팅)

계산 순서 (DB `calculate_effective_price` = `lib/pricing/calculateEffectivePrice.ts`):

1. `sale_price + shipping_fee`
2. `instant` / `other`: 정액 → 비율 (`apply_order`)
3. `card_charge`: 잔액에 %
4. `cashback`: 결제 예상액 기준 % → 체감가에서 차감

한쪽만 수정하지 말고 **항상 둘 다** 맞춘다.

### 4.3 카탈로그 (`catalog` 스키마, Rebrickable-style)

- **BOM·부품 참조**: `catalog.sets`, `catalog.inventories`, `catalog.inventory_*`, `catalog.parts`, …
- **리셀 마스터**: `public.products`, `public.themes` (uuid) — 변경 없음
- 연결: `products.catalog_set_num` → `catalog.sets(set_num)`; NULL이면 `product_number` = `set_num` 으로 조인
- `catalog.inventories` ≠ 비즈니스 재고 (`v_inventory_summary`). 이름 혼동 금지
- import·적용 순서: [docs/CATALOG_MIGRATION.md](./docs/CATALOG_MIGRATION.md)
- 조회 뷰: `v_product_catalog`, `v_product_bom_summary` (SELECT only RLS)

### 4.4 마이그레이션

- 파일명: `YYYYMMDDHHMMSS_snake_case.sql`
- **이미 적용된 migration 파일 내용 변경 금지**
- 스키마 변경 후: `npx supabase db reset` (로컬) 또는 `migration up`, 그다음 `npx supabase gen types typescript --local > types/database.ts`
- RLS: 카탈로그 테이블은 anon SELECT; `sourcing_records` / `sales_records` 는 개발용 anon write 정책 존재 (프로덕션 전 정리 예정)

---

## 5. 코드 스타일

### 5.1 Server / Client

- **page.tsx**: 기본 Server Component. 데이터는 `lib/data/*` 에서 fetch.
- 폼·`useActionState`·인터랙션: `"use client"` 컴포넌트로 분리.
- Supabase: 서버는 `lib/supabase/server.ts`, 클라이언트는 `client.ts`.

### 5.2 Server Actions (`app/*/actions.ts`)

```typescript
"use server";
import { revalidatePath } from "next/cache";
import { ... } from "@/lib/data/...";

export async function actionAddX(formData: FormData) {
  // FormData → typed input → lib/data
  await addX(input);
  revalidatePath("/purchases"); // 영향 받는 경로 모두
}
```

- 구매 변경 시: `revalidatePath("/purchases")` + `revalidatePath("/inventory")`
- 판매 변경 시: `revalidatePath("/sales")` + `revalidatePath("/margin")`

### 5.3 UI (Tailwind)

- 페이지 뼈대: `PageShell` → `PageHeader` → (선택) `StatGrid`/`StatCard` → 폼 → `PageSection`
- 카드: `rounded-xl border border-zinc-200 bg-white`
- 테이블 래퍼: `overflow-x-auto rounded-xl border border-zinc-200 bg-white`
- 테이블: `w-full min-w-[600px] text-sm`, 헤더 `bg-zinc-50 text-xs text-zinc-600`
- 강조 금액: 재고 평가액 `text-emerald-700`, 실구매가 `text-emerald-700`, 실수령 `text-blue-700`, 차감 `text-red-600`
- 금액·날짜: `formatKrw`, `formatDate` (`lib/format.ts`) — 인라인 `Intl` 중복 금지
- 폼 필드: `formInputClass` / `formSelectClass` (`components/ui/formStyles.ts`), placeholder `zinc-400`
- UI 문구: **한국어**

### 5.4 타입

- DB 행·폼 입력: `lib/{domain}/types.ts`
- Supabase 생성 타입: `types/database.ts` (`Database` 등)
- 도메인 타입을 `types.ts` 에 두고 `lib/data` 에서 import

### 5.5 범위·품질

- 요청 범위 밖 리팩터·기능 추가 금지.
- 과도한 추상화·한 줄 헬퍼·불필요한 try/catch 금지.
- 테스트는 요청 시에만 추가.
- `.env`, 시크릿 커밋 금지.

---

## 6. 자주 쓰는 파일 템플릿

### `lib/data/example.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import type { ExampleRow } from "@/lib/example/types";

export async function getExamples(): Promise<ExampleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_example").select("*");
  if (error) throw error;
  return (data ?? []) as ExampleRow[];
}
```

### `app/example/page.tsx`

```typescript
import { getExamples } from "@/lib/data/example";

export const dynamic = "force-dynamic";

export default async function ExamplePage() {
  const rows = await getExamples();
  // ...
}
```

---

## 7. 작업 체크리스트 (PR·커밋 전)

- [ ] `AGENT_GUIDE.md` 와 충돌 없음
- [ ] migration 추가 시 기존 migration 미수정
- [ ] 체감가 로직 변경 시 DB 함수 + TS 동시 반영
- [ ] 구매/재고/판매/마진 경로·revalidatePath 일관
- [ ] 린트·타입 오류 없음
- [ ] 사용자가 요청하지 않은 파일 변경 없음

---

## 8. 문서 갱신

구조·도메인 규칙이 바뀌면 **이 파일(`AGENT_GUIDE.md`)을 먼저** 업데이트한다. 그다음 코드를 맞춘다.
