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
