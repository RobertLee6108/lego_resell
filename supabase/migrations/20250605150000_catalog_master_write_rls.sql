-- Dev: allow anon write on resell catalog masters (themes, products)
-- 프로덕션 배포 전 authenticated/service_role only 로 전환 권장

CREATE POLICY "themes_anon_insert"
  ON public.themes FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "themes_anon_update"
  ON public.themes FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "themes_anon_delete"
  ON public.themes FOR DELETE TO anon, authenticated
  USING (true);

CREATE POLICY "products_anon_insert"
  ON public.products FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "products_anon_update"
  ON public.products FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "products_anon_delete"
  ON public.products FOR DELETE TO anon, authenticated
  USING (true);
