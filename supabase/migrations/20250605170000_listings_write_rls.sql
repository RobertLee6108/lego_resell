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
