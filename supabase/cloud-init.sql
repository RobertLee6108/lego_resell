-- =============================================================================
-- 클라우드 Supabase 초기 스키마 (마이그레이션 CLI 없이 한 번에 실행)
--
-- 1. https://supabase.com/dashboard/project/wfrusrhqxcwenzjqmulc/sql/new
-- 2. 이 파일 전체를 붙여넣고 Run
-- 3. 샘플 데이터 없음 — 앱에서 직접 입력
--
-- 이미 테이블이 있으면 SQL Editor에서 먼저:
--   DROP SCHEMA IF EXISTS catalog CASCADE;
--   (public 스키마 객체는 Dashboard → Database → Tables에서 삭제)
-- =============================================================================

-- >>> 20250602120000_extensions_and_enums.sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE product_status AS ENUM (
  'on_sale',
  'retiring_soon',
  'discontinued'
);

CREATE TYPE discount_rule_type AS ENUM (
  'instant',
  'card_charge',
  'cashback',
  'other'
);

-- >>> 20250602120100_core_tables.sql
-- Themes (series)
CREATE TABLE themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Retailers
CREATE TABLE retailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  base_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products (product_number = set number PK)
CREATE TABLE products (
  product_number text PRIMARY KEY,
  name text NOT NULL,
  msrp integer NOT NULL CHECK (msrp >= 0),
  status product_status NOT NULL DEFAULT 'on_sale',
  release_date date,
  theme_id uuid REFERENCES themes(id) ON DELETE SET NULL,
  image_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_theme_id_status_idx ON products (theme_id, status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- >>> 20250602120200_listings_and_discount_rules.sql
-- Mall listings per product
CREATE TABLE product_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_number text NOT NULL REFERENCES products(product_number) ON DELETE CASCADE,
  retailer_id uuid NOT NULL REFERENCES retailers(id) ON DELETE CASCADE,
  sale_price integer NOT NULL CHECK (sale_price >= 0),
  shipping_fee integer NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  product_url text,
  in_stock boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_number, retailer_id)
);

CREATE INDEX product_listings_product_number_idx ON product_listings (product_number);

-- Discount rules per listing (row-level, easy to extend)
CREATE TABLE listing_discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
  rule_type discount_rule_type NOT NULL,
  label text NOT NULL,
  percent numeric(5, 2) CHECK (percent IS NULL OR (percent >= 0 AND percent <= 100)),
  fixed_amount integer CHECK (fixed_amount IS NULL OR fixed_amount >= 0),
  apply_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_discount_rules_amount_check CHECK (
    percent IS NOT NULL OR fixed_amount IS NOT NULL
  )
);

CREATE INDEX listing_discount_rules_listing_apply_order_idx
  ON listing_discount_rules (listing_id, apply_order);

-- >>> 20250602120300_effective_price_function_and_view.sql
-- Effective price calculation (mirrors lib/pricing/calculateEffectivePrice.ts)
-- Order: subtotal → instant/other (fixed then %) → card_charge % → cashback % on payment
CREATE OR REPLACE FUNCTION calculate_effective_price(
  p_sale_price integer,
  p_shipping integer,
  p_rules jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  effective_price integer,
  breakdown jsonb
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_amount numeric;
  v_subtotal numeric;
  v_payment_before_cashback numeric;
  v_cashback_total numeric := 0;
  v_deduction numeric;
  v_rule record;
  v_steps jsonb := '[]'::jsonb;
BEGIN
  v_subtotal := p_sale_price + p_shipping;
  v_amount := v_subtotal;

  v_steps := v_steps || jsonb_build_array(
    jsonb_build_object('step', 'subtotal', 'label', '판매가+배송', 'amount', round(v_subtotal))
  );

  -- instant / other: fixed first (apply_order asc)
  FOR v_rule IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_rules, '[]'::jsonb)) AS r(
      rule_type text,
      label text,
      percent numeric,
      fixed_amount integer,
      apply_order smallint,
      is_active boolean
    )
    WHERE COALESCE(is_active, true)
      AND rule_type IN ('instant', 'other')
      AND fixed_amount IS NOT NULL
      AND fixed_amount > 0
    ORDER BY apply_order, label
  LOOP
    v_deduction := v_rule.fixed_amount;
    v_amount := v_amount - v_deduction;
    v_steps := v_steps || jsonb_build_array(
      jsonb_build_object(
        'step', 'deduction_fixed',
        'rule_type', v_rule.rule_type,
        'label', v_rule.label,
        'deduction', round(v_deduction),
        'remaining', round(greatest(v_amount, 0))
      )
    );
  END LOOP;

  -- instant / other: percent (apply_order asc)
  FOR v_rule IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_rules, '[]'::jsonb)) AS r(
      rule_type text,
      label text,
      percent numeric,
      fixed_amount integer,
      apply_order smallint,
      is_active boolean
    )
    WHERE COALESCE(is_active, true)
      AND rule_type IN ('instant', 'other')
      AND percent IS NOT NULL
      AND percent > 0
    ORDER BY apply_order, label
  LOOP
    v_deduction := v_amount * (v_rule.percent / 100.0);
    v_amount := v_amount - v_deduction;
    v_steps := v_steps || jsonb_build_array(
      jsonb_build_object(
        'step', 'deduction_percent',
        'rule_type', v_rule.rule_type,
        'label', v_rule.label,
        'percent', v_rule.percent,
        'deduction', round(v_deduction),
        'remaining', round(greatest(v_amount, 0))
      )
    );
  END LOOP;

  -- card_charge: % on remaining (청구할인)
  FOR v_rule IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_rules, '[]'::jsonb)) AS r(
      rule_type text,
      label text,
      percent numeric,
      fixed_amount integer,
      apply_order smallint,
      is_active boolean
    )
    WHERE COALESCE(is_active, true)
      AND rule_type = 'card_charge'
      AND percent IS NOT NULL
      AND percent > 0
    ORDER BY apply_order, label
  LOOP
    v_deduction := v_amount * (v_rule.percent / 100.0);
    v_amount := v_amount - v_deduction;
    v_steps := v_steps || jsonb_build_array(
      jsonb_build_object(
        'step', 'card_charge',
        'label', v_rule.label,
        'percent', v_rule.percent,
        'deduction', round(v_deduction),
        'remaining', round(greatest(v_amount, 0))
      )
    );
  END LOOP;

  v_payment_before_cashback := greatest(v_amount, 0);
  v_steps := v_steps || jsonb_build_array(
    jsonb_build_object(
      'step', 'payment_before_cashback',
      'label', '결제 예상액',
      'amount', round(v_payment_before_cashback)
    )
  );

  -- cashback: % of payment → reduces effective price
  FOR v_rule IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_rules, '[]'::jsonb)) AS r(
      rule_type text,
      label text,
      percent numeric,
      fixed_amount integer,
      apply_order smallint,
      is_active boolean
    )
    WHERE COALESCE(is_active, true)
      AND rule_type = 'cashback'
      AND percent IS NOT NULL
      AND percent > 0
    ORDER BY apply_order, label
  LOOP
    v_deduction := v_payment_before_cashback * (v_rule.percent / 100.0);
    v_cashback_total := v_cashback_total + v_deduction;
    v_steps := v_steps || jsonb_build_array(
      jsonb_build_object(
        'step', 'cashback',
        'label', v_rule.label,
        'percent', v_rule.percent,
        'deduction', round(v_deduction)
      )
    );
  END LOOP;

  v_amount := greatest(v_payment_before_cashback - v_cashback_total, 0);

  v_steps := v_steps || jsonb_build_array(
    jsonb_build_object('step', 'effective_price', 'label', '체감 실구매가', 'amount', round(v_amount))
  );

  effective_price := round(v_amount)::integer;
  breakdown := jsonb_build_object('steps', v_steps);
  RETURN NEXT;
END;
$$;

-- Comparison view for catalog / detail pages
CREATE OR REPLACE VIEW v_product_price_comparison AS
SELECT
  p.product_number,
  p.name AS product_name,
  p.msrp,
  p.status AS product_status,
  pl.id AS listing_id,
  pl.sale_price,
  pl.shipping_fee,
  pl.product_url,
  pl.in_stock,
  pl.last_checked_at,
  r.id AS retailer_id,
  r.name AS retailer_name,
  r.slug AS retailer_slug,
  r.logo_url AS retailer_logo_url,
  calc.effective_price,
  calc.breakdown,
  (p.msrp - calc.effective_price) AS savings_vs_msrp,
  CASE
    WHEN p.msrp > 0 THEN round((calc.effective_price::numeric / p.msrp) * 100, 1)
    ELSE NULL
  END AS effective_vs_msrp_pct
FROM products p
JOIN product_listings pl ON pl.product_number = p.product_number
JOIN retailers r ON r.id = pl.retailer_id
CROSS JOIN LATERAL calculate_effective_price(
  pl.sale_price,
  pl.shipping_fee,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'rule_type', ldr.rule_type,
          'label', ldr.label,
          'percent', ldr.percent,
          'fixed_amount', ldr.fixed_amount,
          'apply_order', ldr.apply_order,
          'is_active', ldr.is_active
        )
        ORDER BY ldr.apply_order, ldr.label
      )
      FROM listing_discount_rules ldr
      WHERE ldr.listing_id = pl.id AND ldr.is_active = true
    ),
    '[]'::jsonb
  )
) AS calc;

-- >>> 20250602120400_rls_policies.sql
-- Row Level Security: public read for catalog
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_discount_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "themes_select_anon"
  ON themes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "retailers_select_anon"
  ON retailers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "products_select_anon"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "product_listings_select_anon"
  ON product_listings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "listing_discount_rules_select_anon"
  ON listing_discount_rules FOR SELECT
  TO anon, authenticated
  USING (true);

-- Views use invoker rights; grant SELECT on view
GRANT SELECT ON v_product_price_comparison TO anon, authenticated;

-- >>> 20250604120500_inventory_sales.sql
-- Sourcing records (매입 이력)
CREATE TABLE sourcing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_number text NOT NULL REFERENCES products(product_number) ON DELETE RESTRICT,
  purchased_at date NOT NULL DEFAULT CURRENT_DATE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost integer NOT NULL CHECK (unit_cost >= 0),
  source_note text,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sourcing_records_product_number_idx ON sourcing_records (product_number);
CREATE INDEX sourcing_records_purchased_at_idx ON sourcing_records (purchased_at);

-- Sales records (판매 이력)
CREATE TABLE sales_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_number text NOT NULL REFERENCES products(product_number) ON DELETE RESTRICT,
  retailer_id uuid REFERENCES retailers(id) ON DELETE SET NULL,
  sold_at date NOT NULL DEFAULT CURRENT_DATE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_sale_price integer NOT NULL CHECK (unit_sale_price >= 0),
  platform_fee_rate numeric(5, 2) NOT NULL DEFAULT 0 CHECK (platform_fee_rate >= 0 AND platform_fee_rate <= 100),
  shipping_out_cost integer NOT NULL DEFAULT 0 CHECK (shipping_out_cost >= 0),
  import_source text,   -- CSV 등 외부 import 출처 (향후 확장용)
  memo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sales_records_product_number_idx ON sales_records (product_number);
CREATE INDEX sales_records_sold_at_idx ON sales_records (sold_at);

-- >>> 20250604120600_margin_views.sql
-- Inventory summary view (제품별 재고 현황)
CREATE OR REPLACE VIEW v_inventory_summary AS
WITH
  sourced AS (
    SELECT
      product_number,
      COALESCE(SUM(quantity), 0) AS total_sourced,
      COALESCE(SUM(quantity * unit_cost), 0) AS total_cost_amount
    FROM sourcing_records
    GROUP BY product_number
  ),
  sold AS (
    SELECT
      product_number,
      COALESCE(SUM(quantity), 0) AS total_sold
    FROM sales_records
    GROUP BY product_number
  )
SELECT
  p.product_number,
  p.name,
  p.msrp,
  p.status,
  COALESCE(s.total_sourced, 0) AS total_sourced,
  COALESCE(sl.total_sold, 0) AS total_sold,
  GREATEST(COALESCE(s.total_sourced, 0) - COALESCE(sl.total_sold, 0), 0) AS current_stock,
  CASE
    WHEN COALESCE(s.total_sourced, 0) > 0
    THEN round(s.total_cost_amount::numeric / s.total_sourced, 0)::integer
    ELSE NULL
  END AS avg_cost,
  CASE
    WHEN COALESCE(s.total_sourced, 0) > 0
    THEN GREATEST(COALESCE(s.total_sourced, 0) - COALESCE(sl.total_sold, 0), 0)
         * round(s.total_cost_amount::numeric / s.total_sourced, 0)::integer
    ELSE 0
  END AS stock_value
FROM products p
LEFT JOIN sourced s ON s.product_number = p.product_number
LEFT JOIN sold sl ON sl.product_number = p.product_number;

-- Margin summary view (제품별 마진)
-- 순이익 = 판매수익 - 플랫폼수수료 - 발송비 - (avg_cost × 판매수량)
-- ROI    = 순이익 / 총원가 × 100
CREATE OR REPLACE VIEW v_margin_summary AS
WITH
  avg_costs AS (
    SELECT
      product_number,
      CASE
        WHEN SUM(quantity) > 0
        THEN round(SUM(quantity * unit_cost)::numeric / SUM(quantity), 0)::integer
        ELSE 0
      END AS avg_cost
    FROM sourcing_records
    GROUP BY product_number
  ),
  sales_agg AS (
    SELECT
      sr.product_number,
      SUM(sr.quantity) AS total_sold,
      SUM(sr.quantity * sr.unit_sale_price) AS total_revenue,
      SUM(
        round(sr.quantity * sr.unit_sale_price * sr.platform_fee_rate / 100.0, 0)
      ) AS total_platform_fee,
      SUM(sr.shipping_out_cost) AS total_shipping_out
    FROM sales_records sr
    GROUP BY sr.product_number
  )
SELECT
  p.product_number,
  p.name,
  p.msrp,
  COALESCE(sa.total_sold, 0) AS total_sold,
  COALESCE(sa.total_revenue, 0) AS total_revenue,
  COALESCE(sa.total_platform_fee, 0) AS total_platform_fee,
  COALESCE(sa.total_shipping_out, 0) AS total_shipping_out,
  COALESCE(ac.avg_cost, 0) * COALESCE(sa.total_sold, 0) AS total_cost_basis,
  COALESCE(sa.total_revenue, 0)
    - COALESCE(sa.total_platform_fee, 0)
    - COALESCE(sa.total_shipping_out, 0)
    - COALESCE(ac.avg_cost, 0) * COALESCE(sa.total_sold, 0) AS net_profit,
  CASE
    WHEN COALESCE(ac.avg_cost, 0) * COALESCE(sa.total_sold, 0) > 0
    THEN round(
      (
        COALESCE(sa.total_revenue, 0)
        - COALESCE(sa.total_platform_fee, 0)
        - COALESCE(sa.total_shipping_out, 0)
        - COALESCE(ac.avg_cost, 0) * COALESCE(sa.total_sold, 0)
      )::numeric
      / (COALESCE(ac.avg_cost, 0) * COALESCE(sa.total_sold, 0)) * 100,
      1
    )
    ELSE NULL
  END AS roi_pct
FROM products p
LEFT JOIN sales_agg sa ON sa.product_number = p.product_number
LEFT JOIN avg_costs ac ON ac.product_number = p.product_number
WHERE COALESCE(sa.total_sold, 0) > 0 OR EXISTS (
  SELECT 1 FROM sourcing_records sr WHERE sr.product_number = p.product_number
);

-- >>> 20250604120700_rls_management_tables.sql
-- RLS for management tables (개인 관리 데이터 — authenticated만 쓰기 허용)
ALTER TABLE sourcing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;

-- 인증 사용자 전체 접근 (개인 도구이므로 authenticated = 본인)
CREATE POLICY "sourcing_records_authenticated_all"
  ON sourcing_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sales_records_authenticated_all"
  ON sales_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 개발 편의: 로컬에서 anon으로도 접근 가능하도록 SELECT 허용
-- (프로덕션 배포 전 이 정책은 삭제할 것)
CREATE POLICY "sourcing_records_anon_select"
  ON sourcing_records FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "sales_records_anon_select"
  ON sales_records FOR SELECT
  TO anon
  USING (true);

-- anon INSERT/UPDATE/DELETE는 서비스롤 또는 authenticated에서만 허용
-- 개발 중 UI에서 insert 사용하려면 아래 정책 추가 (개발용)
CREATE POLICY "sourcing_records_anon_write"
  ON sourcing_records FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "sourcing_records_anon_update"
  ON sourcing_records FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sourcing_records_anon_delete"
  ON sourcing_records FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "sales_records_anon_write"
  ON sales_records FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "sales_records_anon_update"
  ON sales_records FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sales_records_anon_delete"
  ON sales_records FOR DELETE
  TO anon
  USING (true);

-- Views
GRANT SELECT ON v_inventory_summary TO anon, authenticated;
GRANT SELECT ON v_margin_summary TO anon, authenticated;

-- >>> 20250604130000_sourcing_records_purchase_columns.sql
-- Add purchase-specific columns to sourcing_records (backwards-compatible, NULL-allowed)
ALTER TABLE sourcing_records
  ADD COLUMN IF NOT EXISTS retailer_id uuid REFERENCES retailers(id) ON DELETE SET NULL;

ALTER TABLE sourcing_records
  ADD COLUMN IF NOT EXISTS effective_price_paid integer
    CHECK (effective_price_paid IS NULL OR effective_price_paid >= 0);

CREATE INDEX IF NOT EXISTS sourcing_records_retailer_id_idx
  ON sourcing_records (retailer_id);

-- Purchase history view (sourcing_records + product + retailer)
CREATE OR REPLACE VIEW v_purchase_history AS
SELECT
  sr.id,
  sr.product_number,
  p.name                                                        AS product_name,
  p.msrp,
  sr.purchased_at,
  sr.quantity,
  sr.unit_cost,
  sr.unit_cost * sr.quantity                                    AS total_cost,
  sr.effective_price_paid,
  COALESCE(sr.effective_price_paid, sr.unit_cost) * sr.quantity AS total_effective_cost,
  sr.retailer_id,
  r.name                                                        AS retailer_name,
  sr.source_note,
  sr.memo,
  sr.created_at
FROM sourcing_records sr
JOIN products p ON p.product_number = sr.product_number
LEFT JOIN retailers r ON r.id = sr.retailer_id
ORDER BY sr.purchased_at DESC, sr.created_at DESC;

GRANT SELECT ON v_purchase_history TO anon, authenticated;

-- >>> 20250605140000_catalog_schema.sql
-- Rebrickable-style LEGO catalog (BOM / parts reference)
-- Separated from public.* resell schema to avoid clashing with public.themes (uuid, slug).
-- Import: Rebrickable CSV → catalog.* tables; link via products.catalog_set_num or product_number = set_num.

CREATE SCHEMA IF NOT EXISTS catalog;

COMMENT ON SCHEMA catalog IS
  'Official-style set/part catalog and BOM. Read-heavy; populated by CSV import. Not resell inventory.';

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------

CREATE TABLE catalog.themes (
  id integer PRIMARY KEY,
  name varchar(40) NOT NULL,
  parent_id integer REFERENCES catalog.themes (id) ON DELETE SET NULL
);

CREATE INDEX catalog_themes_parent_id_idx ON catalog.themes (parent_id);

CREATE TABLE catalog.colors (
  id integer PRIMARY KEY,
  name varchar(200) NOT NULL,
  rgb varchar(6) NOT NULL,
  is_trans boolean NOT NULL DEFAULT false
);

CREATE TABLE catalog.part_categories (
  id integer PRIMARY KEY,
  name varchar(200) NOT NULL
);

CREATE TABLE catalog.parts (
  part_num varchar(20) PRIMARY KEY,
  name varchar(250) NOT NULL,
  part_cat_id integer REFERENCES catalog.part_categories (id) ON DELETE SET NULL
);

CREATE INDEX catalog_parts_part_cat_id_idx ON catalog.parts (part_cat_id);

CREATE TABLE catalog.minifigs (
  fig_num varchar(20) PRIMARY KEY,
  name varchar(256) NOT NULL,
  num_parts integer
);

CREATE TABLE catalog.sets (
  set_num varchar(20) PRIMARY KEY,
  name varchar(256) NOT NULL,
  year integer,
  theme_id integer REFERENCES catalog.themes (id) ON DELETE SET NULL,
  num_parts integer
);

CREATE INDEX catalog_sets_theme_id_idx ON catalog.sets (theme_id);
CREATE INDEX catalog_sets_year_idx ON catalog.sets (year);

-- part_num + color_id sellable SKU
CREATE TABLE catalog.elements (
  element_id varchar(10) PRIMARY KEY,
  part_num varchar(20) NOT NULL REFERENCES catalog.parts (part_num) ON DELETE CASCADE,
  color_id integer NOT NULL REFERENCES catalog.colors (id) ON DELETE CASCADE
);

CREATE INDEX catalog_elements_part_color_idx ON catalog.elements (part_num, color_id);

-- parent/child part mold relationships (rel_type: e.g. alternate, counterpart)
CREATE TABLE catalog.part_relationships (
  rel_type varchar(1) NOT NULL,
  child_part_num varchar(20) NOT NULL REFERENCES catalog.parts (part_num) ON DELETE CASCADE,
  parent_part_num varchar(20) NOT NULL REFERENCES catalog.parts (part_num) ON DELETE CASCADE,
  PRIMARY KEY (rel_type, child_part_num, parent_part_num)
);

-- ---------------------------------------------------------------------------
-- BOM (bill of materials) — NOT business stock (see v_inventory_summary)
-- ---------------------------------------------------------------------------

CREATE TABLE catalog.inventories (
  id integer PRIMARY KEY,
  version integer NOT NULL,
  set_num varchar(20) NOT NULL REFERENCES catalog.sets (set_num) ON DELETE CASCADE
);

CREATE INDEX catalog_inventories_set_num_idx ON catalog.inventories (set_num);

CREATE TABLE catalog.inventory_parts (
  inventory_id integer NOT NULL REFERENCES catalog.inventories (id) ON DELETE CASCADE,
  part_num varchar(20) NOT NULL REFERENCES catalog.parts (part_num) ON DELETE CASCADE,
  color_id integer NOT NULL REFERENCES catalog.colors (id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity >= 0),
  is_spare boolean NOT NULL DEFAULT false,
  PRIMARY KEY (inventory_id, part_num, color_id, is_spare)
);

CREATE TABLE catalog.inventory_minifigs (
  inventory_id integer NOT NULL REFERENCES catalog.inventories (id) ON DELETE CASCADE,
  fig_num varchar(20) NOT NULL REFERENCES catalog.minifigs (fig_num) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (inventory_id, fig_num)
);

CREATE TABLE catalog.inventory_sets (
  inventory_id integer NOT NULL REFERENCES catalog.inventories (id) ON DELETE CASCADE,
  set_num varchar(20) NOT NULL REFERENCES catalog.sets (set_num) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (inventory_id, set_num)
);

-- >>> 20250605140100_catalog_link_rls_views.sql
-- Link public.products ↔ catalog.sets, RLS (read-only), helper views

-- Optional explicit link; when NULL, views fall back to product_number = set_num
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog_set_num varchar(20)
    REFERENCES catalog.sets (set_num) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_catalog_set_num_idx
  ON public.products (catalog_set_num);

COMMENT ON COLUMN public.products.catalog_set_num IS
  'FK to catalog.sets. If NULL, product_number is treated as set_num when joined.';

-- Resolved set_num for joins
CREATE OR REPLACE FUNCTION public.resolve_catalog_set_num(p_product_number text, p_catalog_set_num varchar)
RETURNS varchar
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_catalog_set_num, p_product_number)::varchar(20);
$$;

-- Product + official catalog metadata (left join — works before CSV import)
CREATE OR REPLACE VIEW public.v_product_catalog AS
SELECT
  p.product_number,
  p.name AS product_name,
  p.msrp,
  p.status,
  p.release_date,
  p.theme_id AS resell_theme_id,
  rt.name AS resell_theme_name,
  public.resolve_catalog_set_num(p.product_number, p.catalog_set_num) AS catalog_set_num,
  cs.name AS catalog_set_name,
  cs.year AS catalog_year,
  cs.num_parts AS catalog_num_parts,
  ct.id AS catalog_theme_id,
  ct.name AS catalog_theme_name,
  inv.id AS catalog_inventory_id,
  inv.version AS catalog_inventory_version
FROM public.products p
LEFT JOIN public.themes rt ON rt.id = p.theme_id
LEFT JOIN catalog.sets cs
  ON cs.set_num = public.resolve_catalog_set_num(p.product_number, p.catalog_set_num)
LEFT JOIN catalog.themes ct ON ct.id = cs.theme_id
LEFT JOIN LATERAL (
  SELECT i.id, i.version
  FROM catalog.inventories i
  WHERE i.set_num = cs.set_num
  ORDER BY i.version DESC
  LIMIT 1
) inv ON true;

COMMENT ON VIEW public.v_product_catalog IS
  'Resell product row enriched with latest catalog.sets/inventories (by set_num).';

-- BOM line counts per product (for UI badges)
CREATE OR REPLACE VIEW public.v_product_bom_summary AS
SELECT
  vpc.product_number,
  vpc.catalog_set_num,
  vpc.catalog_inventory_id,
  COALESCE(parts.part_lines, 0) AS part_lines,
  COALESCE(parts.spare_lines, 0) AS spare_lines,
  COALESCE(mf.minifig_lines, 0) AS minifig_lines,
  COALESCE(sub.set_lines, 0) AS sub_set_lines
FROM public.v_product_catalog vpc
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE NOT ip.is_spare) AS part_lines,
    COUNT(*) FILTER (WHERE ip.is_spare) AS spare_lines
  FROM catalog.inventory_parts ip
  WHERE ip.inventory_id = vpc.catalog_inventory_id
) parts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS minifig_lines
  FROM catalog.inventory_minifigs im
  WHERE im.inventory_id = vpc.catalog_inventory_id
) mf ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS set_lines
  FROM catalog.inventory_sets ist
  WHERE ist.inventory_id = vpc.catalog_inventory_id
) sub ON true;

-- ---------------------------------------------------------------------------
-- RLS: catalog = read-only for anon/authenticated
-- ---------------------------------------------------------------------------

ALTER TABLE catalog.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.minifigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.part_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.inventory_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.inventory_minifigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.inventory_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_themes_select"
  ON catalog.themes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_colors_select"
  ON catalog.colors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_part_categories_select"
  ON catalog.part_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_parts_select"
  ON catalog.parts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_minifigs_select"
  ON catalog.minifigs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_sets_select"
  ON catalog.sets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_elements_select"
  ON catalog.elements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_part_relationships_select"
  ON catalog.part_relationships FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_inventories_select"
  ON catalog.inventories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_inventory_parts_select"
  ON catalog.inventory_parts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_inventory_minifigs_select"
  ON catalog.inventory_minifigs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_inventory_sets_select"
  ON catalog.inventory_sets FOR SELECT TO anon, authenticated USING (true);

GRANT USAGE ON SCHEMA catalog TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA catalog TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog
  GRANT SELECT ON TABLES TO anon, authenticated;

GRANT SELECT ON public.v_product_catalog TO anon, authenticated;
GRANT SELECT ON public.v_product_bom_summary TO anon, authenticated;

-- >>> 20250605150000_catalog_master_write_rls.sql
-- Dev: allow anon write on resell catalog masters (themes, products)
-- 프로덕션 배포 전 authenticated/service_role only 로 전환 권장

CREATE POLICY "themes_anon_insert"
  ON public.themes FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "themes_anon_update"
  ON public.themes FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "themes_anon_delete"
  ON public.themes FOR DELETE TO anon, authenticated
  USING (true);

CREATE POLICY "products_anon_insert"
  ON public.products FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "products_anon_update"
  ON public.products FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "products_anon_delete"
  ON public.products FOR DELETE TO anon, authenticated
  USING (true);

-- >>> 20250605160000_retailers_write_rls.sql
-- Dev: allow anon write on retailers (쇼핑몰 마스터)

CREATE POLICY "retailers_anon_insert"
  ON public.retailers FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "retailers_anon_update"
  ON public.retailers FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "retailers_anon_delete"
  ON public.retailers FOR DELETE TO anon, authenticated
  USING (true);

-- >>> 20250605170000_listings_write_rls.sql
-- Dev: allow anon write on mall listings and discount rules
-- 프로덕션 배포 전 authenticated/service_role only 로 전환 권장

CREATE POLICY "product_listings_anon_insert"
  ON public.product_listings FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "product_listings_anon_update"
  ON public.product_listings FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "product_listings_anon_delete"
  ON public.product_listings FOR DELETE TO anon, authenticated
  USING (true);

CREATE POLICY "listing_discount_rules_anon_insert"
  ON public.listing_discount_rules FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "listing_discount_rules_anon_update"
  ON public.listing_discount_rules FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "listing_discount_rules_anon_delete"
  ON public.listing_discount_rules FOR DELETE TO anon, authenticated
  USING (true);
