-- RLS for management tables (개인 관리 데이터 — authenticated만 쓰기 허용)
ALTER TABLE sourcing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;

-- 인증 사용자 전체 접근 (개인 도구이므로 authenticated = 본인)
CREATE POLICY "sourcing_records_authenticated_all"
  ON sourcing_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sales_records_authenticated_all"
  ON sales_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 개발 편의: 로컬에서 anon으로도 접근 가능하도록 SELECT 허용
-- (프로덕션 배포 전 이 정책은 삭제할 것)
CREATE POLICY "sourcing_records_anon_select"
  ON sourcing_records FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "sales_records_anon_select"
  ON sales_records FOR SELECT
  TO anon
  USING (true);

-- anon INSERT/UPDATE/DELETE는 서비스롤 또는 authenticated에서만 허용
-- 개발 중 UI에서 insert 사용하려면 아래 정책 추가 (개발용)
CREATE POLICY "sourcing_records_anon_write"
  ON sourcing_records FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "sourcing_records_anon_update"
  ON sourcing_records FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sourcing_records_anon_delete"
  ON sourcing_records FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "sales_records_anon_write"
  ON sales_records FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "sales_records_anon_update"
  ON sales_records FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sales_records_anon_delete"
  ON sales_records FOR DELETE
  TO anon
  USING (true);

-- Views
GRANT SELECT ON v_inventory_summary TO anon, authenticated;
GRANT SELECT ON v_margin_summary TO anon, authenticated;
