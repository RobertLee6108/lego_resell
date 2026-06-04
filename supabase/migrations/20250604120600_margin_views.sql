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
