-- Store Naver Shopping search snapshots and watch targets per user.

CREATE TABLE naver_shopping_search_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  queries text[] NOT NULL CHECK (array_length(queries, 1) BETWEEN 1 AND 5),
  sort text NOT NULL DEFAULT 'sim' CHECK (sort IN ('sim', 'date', 'asc', 'dsc')),
  display integer NOT NULL DEFAULT 20 CHECK (display BETWEEN 1 AND 100),
  include_shipping boolean NOT NULL DEFAULT false,
  filter text CHECK (filter IS NULL OR filter IN ('naverpay')),
  exclude text,
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE naver_shopping_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES naver_shopping_search_runs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  query text NOT NULL,
  product_number text REFERENCES products(product_number) ON DELETE SET NULL,
  naver_product_id text NOT NULL,
  title text NOT NULL,
  link text NOT NULL,
  image text,
  mall_name text NOT NULL,
  lprice integer NOT NULL DEFAULT 0 CHECK (lprice >= 0),
  hprice integer NOT NULL DEFAULT 0 CHECK (hprice >= 0),
  product_type integer NOT NULL DEFAULT 0 CHECK (product_type >= 0),
  brand text,
  maker text,
  category1 text,
  category2 text,
  category3 text,
  category4 text,
  shipping_fee_override integer CHECK (shipping_fee_override IS NULL OR shipping_fee_override >= 0),
  effective_price integer GENERATED ALWAYS AS (lprice + COALESCE(shipping_fee_override, 0)) STORED,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE naver_shopping_watch_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  product_number text REFERENCES products(product_number) ON DELETE SET NULL,
  keyword text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  interval_minutes integer NOT NULL DEFAULT 60 CHECK (interval_minutes BETWEEN 15 AND 10080),
  last_run_at timestamptz,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  sort text NOT NULL DEFAULT 'asc' CHECK (sort IN ('sim', 'date', 'asc', 'dsc')),
  display integer NOT NULL DEFAULT 20 CHECK (display BETWEEN 1 AND 100),
  include_used boolean NOT NULL DEFAULT false,
  include_overseas boolean NOT NULL DEFAULT false,
  include_shipping boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX naver_shopping_search_runs_user_created_idx
  ON naver_shopping_search_runs (user_id, created_at DESC);

CREATE INDEX naver_shopping_search_results_run_idx
  ON naver_shopping_search_results (run_id);

CREATE INDEX naver_shopping_search_results_user_product_idx
  ON naver_shopping_search_results (user_id, product_number, created_at DESC);

CREATE INDEX naver_shopping_search_results_user_naver_product_idx
  ON naver_shopping_search_results (user_id, naver_product_id, created_at DESC);

CREATE INDEX naver_shopping_watch_targets_due_idx
  ON naver_shopping_watch_targets (enabled, next_run_at)
  WHERE enabled = true;

CREATE INDEX naver_shopping_watch_targets_user_idx
  ON naver_shopping_watch_targets (user_id, enabled, next_run_at);

CREATE TRIGGER naver_shopping_watch_targets_updated_at
  BEFORE UPDATE ON naver_shopping_watch_targets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE naver_shopping_search_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE naver_shopping_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE naver_shopping_watch_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "naver_shopping_search_runs_user_own_rows"
  ON naver_shopping_search_runs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "naver_shopping_search_results_user_own_rows"
  ON naver_shopping_search_results
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "naver_shopping_watch_targets_user_own_rows"
  ON naver_shopping_watch_targets
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
