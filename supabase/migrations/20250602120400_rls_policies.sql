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
