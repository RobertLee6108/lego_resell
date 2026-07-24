-- Repricing engine: per-SKU price monitoring snapshots, repricing rules, and change history.
-- Keyed by products.product_number (stock_products/stock_lots do not exist yet;
-- link those in a later migration once that schema lands).

CREATE TABLE price_monitoring_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  product_number text NOT NULL REFERENCES products(product_number) ON DELETE CASCADE,
  watch_target_id uuid REFERENCES naver_shopping_watch_targets(id) ON DELETE SET NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  market_lowest_price integer CHECK (market_lowest_price IS NULL OR market_lowest_price >= 0),
  seller_count integer NOT NULL DEFAULT 0 CHECK (seller_count >= 0),
  matched_seller_name text,
  -- Naver Shopping 검색 API에는 품절임박 배지 정보가 없어 사람이 확인 후 수동 입력한다.
  is_soon_out_of_stock boolean NOT NULL DEFAULT false,
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX price_monitoring_log_product_checked_idx
  ON price_monitoring_log (product_number, checked_at DESC);

CREATE INDEX price_monitoring_log_user_idx
  ON price_monitoring_log (user_id);

CREATE TABLE repricing_rules (
  product_number text PRIMARY KEY REFERENCES products(product_number) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  -- 현재는 'catalog_lowest_minus_100' 한 가지만 구현. 새 공식 추가 시 CHECK 목록도 갱신.
  target_formula_type text NOT NULL DEFAULT 'catalog_lowest_minus_100'
    CHECK (target_formula_type IN ('catalog_lowest_minus_100')),
  dead_zone_won integer NOT NULL DEFAULT 500 CHECK (dead_zone_won >= 0),
  min_margin_won integer NOT NULL CHECK (min_margin_won >= 0),
  bep_price integer NOT NULL CHECK (bep_price >= 0),
  floor_price integer CHECK (floor_price IS NULL OR floor_price >= 0),
  enabled boolean NOT NULL DEFAULT true,
  -- 품절임박 경쟁사 hold 상태
  hold_reason text CHECK (hold_reason IS NULL OR hold_reason IN ('competitor_soon_out_of_stock')),
  hold_until timestamptz,
  hold_recheck_hours integer NOT NULL DEFAULT 36 CHECK (hold_recheck_hours BETWEEN 1 AND 168),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (hold_reason IS NOT NULL OR hold_until IS NULL)
);

CREATE INDEX repricing_rules_user_idx ON repricing_rules (user_id);

CREATE TRIGGER repricing_rules_updated_at
  BEFORE UPDATE ON repricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE repricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  product_number text NOT NULL REFERENCES products(product_number) ON DELETE CASCADE,
  monitoring_log_id uuid REFERENCES price_monitoring_log(id) ON DELETE SET NULL,
  old_price integer NOT NULL CHECK (old_price >= 0),
  new_price integer NOT NULL CHECK (new_price >= 0),
  trigger_reason text NOT NULL CHECK (
    trigger_reason IN (
      'dead_zone_exceeded',
      'persistence_confirmed',
      'soon_out_of_stock_hold',
      'manual'
    )
  ),
  approved_by text NOT NULL CHECK (approved_by IN ('telegram', 'auto')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX repricing_history_product_created_idx
  ON repricing_history (product_number, created_at DESC);

CREATE INDEX repricing_history_user_idx ON repricing_history (user_id);

ALTER TABLE price_monitoring_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE repricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE repricing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_monitoring_log_user_own_rows"
  ON price_monitoring_log
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "repricing_rules_user_own_rows"
  ON repricing_rules
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "repricing_history_user_own_rows"
  ON repricing_history
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
