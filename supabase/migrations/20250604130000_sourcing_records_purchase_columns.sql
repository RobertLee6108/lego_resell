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
