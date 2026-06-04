# Catalog 스키마 마이그레이션 초안

Rebrickable 스타일 ERD를 `catalog` 스키마로 분리해 두었습니다. **리셀 운영 테이블(`public.*`)은 그대로** 두고, 공식 세트/부품/BOM만 추가합니다.

## 마이그레이션 파일

| 파일 | 내용 |
|------|------|
| `20250605140000_catalog_schema.sql` | `catalog.*` 테이블 12개 (themes, sets, parts, inventories, …) |
| `20250605140100_catalog_link_rls_views.sql` | `products.catalog_set_num`, 뷰, RLS, GRANT |

## 스키마 분리 이유

| 참고 ERD | pro (기존) | 초안 |
|----------|------------|------|
| `themes` (int, 계층) | `public.themes` (uuid, slug) | **`catalog.themes`** — 이름 충돌 방지 |
| `inventories` (BOM) | `v_inventory_summary` (보유 재고) | **`catalog.inventories`** — 의미 분리 |
| 구매/가격 없음 | `sourcing_records`, `product_listings` | **변경 없음** |

## `products` 연결 규칙

- `products.catalog_set_num` → `catalog.sets(set_num)` (선택 FK)
- 비어 있으면 **`product_number`를 `set_num`으로 간주** (`resolve_catalog_set_num`)
- 예: `product_number = '10316'` 이고 catalog에 `10316-1`만 있으면 → import 후 `catalog_set_num`에 `10316-1` 명시

## 조회 뷰

- `v_product_catalog` — 리셀 제품 + 카탈로그 세트/테마 + 최신 BOM inventory 버전
- `v_product_bom_summary` — 부품/스페어/미니피그/하위세트 라인 수

## 로컬 적용

```bash
npx supabase db reset
# 또는
npx supabase migration up

npx supabase gen types typescript --local > types/database.ts
```

## CSV import 순서 (Rebrickable downloads)

FK 순서를 지켜야 합니다.

1. `themes.csv` → `catalog.themes`
2. `colors.csv` → `catalog.colors`
3. `part_categories.csv` → `catalog.part_categories`
4. `parts.csv` → `catalog.parts`
5. `minifigs.csv` → `catalog.minifigs`
6. `sets.csv` → `catalog.sets`
7. `elements.csv` → `catalog.elements`
8. `part_relationships.csv` → `catalog.part_relationships`
9. `inventories.csv` → `catalog.inventories`
10. `inventory_parts.csv` → `catalog.inventory_parts`
11. `inventory_minifigs.csv` → `catalog.inventory_minifigs`
12. `inventory_sets.csv` → `catalog.inventory_sets`

`COPY` 또는 Supabase Table Editor / 스크립트(`scripts/import-rebrickable.ts` 등)로 적재. **쓰기는 service_role** 권장 (RLS는 SELECT만 열림).

## 이후 작업 (초안 범위 밖)

- [ ] import 스크립트
- [ ] 제품 상세 페이지 BOM 탭 (`v_product_bom_summary` + `inventory_parts` 조인)
- [ ] `AGENT_GUIDE.md` §4.4 카탈로그 규칙 반영
- [ ] 프로덕션: catalog INSERT 정책 제거 유지, batch만 service_role

## ER 요약

```
public.products ──catalog_set_num──► catalog.sets
                                        │
                    catalog.inventories ◄┘
                         ├── inventory_parts → parts, colors
                         ├── inventory_minifigs → minifigs
                         └── inventory_sets → sets (sub-sets)

public.sourcing_records → public.products  (구매 이력, 변경 없음)
v_inventory_summary      (비즈니스 재고, 변경 없음)
```
