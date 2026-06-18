-- Deduplicate Naver Smart Store settlement imports per user.

ALTER TABLE sales_records
  ADD COLUMN IF NOT EXISTS external_order_id text;

CREATE UNIQUE INDEX IF NOT EXISTS sales_records_import_dedup_idx
  ON sales_records (user_id, import_source, external_order_id)
  WHERE external_order_id IS NOT NULL;
