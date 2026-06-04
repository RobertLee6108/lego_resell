# 레고 리셀 가격 비교

Next.js App Router + Supabase로 레고 세트의 몰별 **체감 실구매가**를 비교합니다.

## 시작하기

```bash
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 입력

npm install
npm run dev
```

### 로컬 Supabase (Docker Desktop 필요)

```bash
npx supabase start
npx supabase db reset          # 마이그레이션 + seed.sql
npx supabase status            # API URL, anon key 확인 → .env.local

npx supabase gen types typescript --local > types/database.ts
```

### 원격 프로젝트

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

## 체감가 계산 순서

1. `판매가 + 배송비`
2. `instant` / `other`: 정액 → 비율 (`apply_order`)
3. `card_charge`: 남은 금액에 청구할인 %
4. `cashback`: 결제 예상액 기준 % → 체감가에서 차감

DB 함수 `calculate_effective_price`와 `lib/pricing/calculateEffectivePrice.ts`가 동일 규칙을 사용합니다.

## 카탈로그 스키마 (초안)

Rebrickable 스타일 BOM/부품 데이터는 **`catalog` 스키마**에 분리되어 있습니다. 상세·CSV import 순서는 [docs/CATALOG_MIGRATION.md](./docs/CATALOG_MIGRATION.md).

## 마이그레이션

스키마 변경 시 **기존 migration 파일은 수정하지 말고** 새 파일만 추가:

```
supabase/migrations/
  20250602120000_extensions_and_enums.sql
  20250602120100_core_tables.sql
  20250602120200_listings_and_discount_rules.sql
  20250602120300_effective_price_function_and_view.sql
  20250602120400_rls_policies.sql
```

## 에이전트 / AI 코딩

코드 변경 시 **[AGENT_GUIDE.md](./AGENT_GUIDE.md)** 를 따른다. (Cursor: `.cursor/rules/agent-guide.mdc` 가 항상 적용)

## 주요 경로

| 경로 | 설명 |
|------|------|
| `/` | 제품 카탈로그 |
| `/products/[productNumber]` | 몰별 가격 비교 대시보드 |
| `/purchases` | 구매 이력 |
| `/inventory` | 재고 현황 |
| `/sales` | 판매 이력 |
| `/margin` | 마진 |
