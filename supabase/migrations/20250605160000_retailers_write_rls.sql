-- Dev: allow anon write on retailers (쇼핑몰 마스터)

CREATE POLICY "retailers_anon_insert"
  ON public.retailers FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "retailers_anon_update"
  ON public.retailers FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "retailers_anon_delete"
  ON public.retailers FOR DELETE TO anon, authenticated
  USING (true);
