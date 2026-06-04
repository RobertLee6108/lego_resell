-- Link public.products ↔ catalog.sets, RLS (read-only), helper views

-- Optional explicit link; when NULL, views fall back to product_number = set_num
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog_set_num varchar(20)
    REFERENCES catalog.sets (set_num) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_catalog_set_num_idx
  ON public.products (catalog_set_num);

COMMENT ON COLUMN public.products.catalog_set_num IS
  'FK to catalog.sets. If NULL, product_number is treated as set_num when joined.';

-- Resolved set_num for joins
CREATE OR REPLACE FUNCTION public.resolve_catalog_set_num(p_product_number text, p_catalog_set_num varchar)
RETURNS varchar
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_catalog_set_num, p_product_number)::varchar(20);
$$;

-- Product + official catalog metadata (left join — works before CSV import)
CREATE OR REPLACE VIEW public.v_product_catalog AS
SELECT
  p.product_number,
  p.name AS product_name,
  p.msrp,
  p.status,
  p.release_date,
  p.theme_id AS resell_theme_id,
  rt.name AS resell_theme_name,
  public.resolve_catalog_set_num(p.product_number, p.catalog_set_num) AS catalog_set_num,
  cs.name AS catalog_set_name,
  cs.year AS catalog_year,
  cs.num_parts AS catalog_num_parts,
  ct.id AS catalog_theme_id,
  ct.name AS catalog_theme_name,
  inv.id AS catalog_inventory_id,
  inv.version AS catalog_inventory_version
FROM public.products p
LEFT JOIN public.themes rt ON rt.id = p.theme_id
LEFT JOIN catalog.sets cs
  ON cs.set_num = public.resolve_catalog_set_num(p.product_number, p.catalog_set_num)
LEFT JOIN catalog.themes ct ON ct.id = cs.theme_id
LEFT JOIN LATERAL (
  SELECT i.id, i.version
  FROM catalog.inventories i
  WHERE i.set_num = cs.set_num
  ORDER BY i.version DESC
  LIMIT 1
) inv ON true;

COMMENT ON VIEW public.v_product_catalog IS
  'Resell product row enriched with latest catalog.sets/inventories (by set_num).';

-- BOM line counts per product (for UI badges)
CREATE OR REPLACE VIEW public.v_product_bom_summary AS
SELECT
  vpc.product_number,
  vpc.catalog_set_num,
  vpc.catalog_inventory_id,
  COALESCE(parts.part_lines, 0) AS part_lines,
  COALESCE(parts.spare_lines, 0) AS spare_lines,
  COALESCE(mf.minifig_lines, 0) AS minifig_lines,
  COALESCE(sub.set_lines, 0) AS sub_set_lines
FROM public.v_product_catalog vpc
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE NOT ip.is_spare) AS part_lines,
    COUNT(*) FILTER (WHERE ip.is_spare) AS spare_lines
  FROM catalog.inventory_parts ip
  WHERE ip.inventory_id = vpc.catalog_inventory_id
) parts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS minifig_lines
  FROM catalog.inventory_minifigs im
  WHERE im.inventory_id = vpc.catalog_inventory_id
) mf ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS set_lines
  FROM catalog.inventory_sets ist
  WHERE ist.inventory_id = vpc.catalog_inventory_id
) sub ON true;

-- ---------------------------------------------------------------------------
-- RLS: catalog = read-only for anon/authenticated
-- ---------------------------------------------------------------------------

ALTER TABLE catalog.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.minifigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.part_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.inventory_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.inventory_minifigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.inventory_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_themes_select"
  ON catalog.themes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_colors_select"
  ON catalog.colors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_part_categories_select"
  ON catalog.part_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_parts_select"
  ON catalog.parts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_minifigs_select"
  ON catalog.minifigs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_sets_select"
  ON catalog.sets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_elements_select"
  ON catalog.elements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_part_relationships_select"
  ON catalog.part_relationships FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_inventories_select"
  ON catalog.inventories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_inventory_parts_select"
  ON catalog.inventory_parts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_inventory_minifigs_select"
  ON catalog.inventory_minifigs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "catalog_inventory_sets_select"
  ON catalog.inventory_sets FOR SELECT TO anon, authenticated USING (true);

GRANT USAGE ON SCHEMA catalog TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA catalog TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog
  GRANT SELECT ON TABLES TO anon, authenticated;

GRANT SELECT ON public.v_product_catalog TO anon, authenticated;
GRANT SELECT ON public.v_product_bom_summary TO anon, authenticated;
