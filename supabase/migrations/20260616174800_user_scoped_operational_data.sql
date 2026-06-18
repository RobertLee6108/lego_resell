-- Scope operational data (purchases/sales) per authenticated user.
-- Existing rows without user_id become inaccessible until reassigned.

ALTER TABLE sourcing_records
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE sales_records
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE sourcing_records
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE sales_records
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS sourcing_records_user_id_idx
  ON sourcing_records (user_id);

CREATE INDEX IF NOT EXISTS sales_records_user_id_idx
  ON sales_records (user_id);

DROP POLICY IF EXISTS "sourcing_records_authenticated_all" ON sourcing_records;
DROP POLICY IF EXISTS "sales_records_authenticated_all" ON sales_records;
DROP POLICY IF EXISTS "sourcing_records_anon_select" ON sourcing_records;
DROP POLICY IF EXISTS "sales_records_anon_select" ON sales_records;
DROP POLICY IF EXISTS "sourcing_records_anon_write" ON sourcing_records;
DROP POLICY IF EXISTS "sourcing_records_anon_update" ON sourcing_records;
DROP POLICY IF EXISTS "sourcing_records_anon_delete" ON sourcing_records;
DROP POLICY IF EXISTS "sales_records_anon_write" ON sales_records;
DROP POLICY IF EXISTS "sales_records_anon_update" ON sales_records;
DROP POLICY IF EXISTS "sales_records_anon_delete" ON sales_records;

CREATE POLICY "sourcing_records_user_own_rows"
  ON sourcing_records
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sales_records_user_own_rows"
  ON sales_records
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Purchase history view (user scoped)
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
WHERE sr.user_id = auth.uid()
ORDER BY sr.purchased_at DESC, sr.created_at DESC;

-- Inventory summary view (user scoped)
CREATE OR REPLACE VIEW v_inventory_summary AS
WITH
  sourced AS (
    SELECT
      product_number,
      COALESCE(SUM(quantity), 0) AS total_sourced,
      COALESCE(SUM(quantity * unit_cost), 0) AS total_cost_amount
    FROM sourcing_records
    WHERE user_id = auth.uid()
    GROUP BY product_number
  ),
  sold AS (
    SELECT
      product_number,
      COALESCE(SUM(quantity), 0) AS total_sold
    FROM sales_records
    WHERE user_id = auth.uid()
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

-- Margin summary view (user scoped)
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
    WHERE user_id = auth.uid()
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
    WHERE sr.user_id = auth.uid()
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
  SELECT 1
  FROM sourcing_records sr
  WHERE sr.product_number = p.product_number
    AND sr.user_id = auth.uid()
);

REVOKE SELECT ON v_purchase_history FROM anon;
REVOKE SELECT ON v_inventory_summary FROM anon;
REVOKE SELECT ON v_margin_summary FROM anon;
GRANT SELECT ON v_purchase_history TO authenticated;
GRANT SELECT ON v_inventory_summary TO authenticated;
GRANT SELECT ON v_margin_summary TO authenticated;
