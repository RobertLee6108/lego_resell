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
