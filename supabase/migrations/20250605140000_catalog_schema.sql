-- Rebrickable-style LEGO catalog (BOM / parts reference)
-- Separated from public.* resell schema to avoid clashing with public.themes (uuid, slug).
-- Import: Rebrickable CSV → catalog.* tables; link via products.catalog_set_num or product_number = set_num.

CREATE SCHEMA IF NOT EXISTS catalog;

COMMENT ON SCHEMA catalog IS
  'Official-style set/part catalog and BOM. Read-heavy; populated by CSV import. Not resell inventory.';

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------

CREATE TABLE catalog.themes (
  id integer PRIMARY KEY,
  name varchar(40) NOT NULL,
  parent_id integer REFERENCES catalog.themes (id) ON DELETE SET NULL
);

CREATE INDEX catalog_themes_parent_id_idx ON catalog.themes (parent_id);

CREATE TABLE catalog.colors (
  id integer PRIMARY KEY,
  name varchar(200) NOT NULL,
  rgb varchar(6) NOT NULL,
  is_trans boolean NOT NULL DEFAULT false
);

CREATE TABLE catalog.part_categories (
  id integer PRIMARY KEY,
  name varchar(200) NOT NULL
);

CREATE TABLE catalog.parts (
  part_num varchar(20) PRIMARY KEY,
  name varchar(250) NOT NULL,
  part_cat_id integer REFERENCES catalog.part_categories (id) ON DELETE SET NULL
);

CREATE INDEX catalog_parts_part_cat_id_idx ON catalog.parts (part_cat_id);

CREATE TABLE catalog.minifigs (
  fig_num varchar(20) PRIMARY KEY,
  name varchar(256) NOT NULL,
  num_parts integer
);

CREATE TABLE catalog.sets (
  set_num varchar(20) PRIMARY KEY,
  name varchar(256) NOT NULL,
  year integer,
  theme_id integer REFERENCES catalog.themes (id) ON DELETE SET NULL,
  num_parts integer
);

CREATE INDEX catalog_sets_theme_id_idx ON catalog.sets (theme_id);
CREATE INDEX catalog_sets_year_idx ON catalog.sets (year);

-- part_num + color_id sellable SKU
CREATE TABLE catalog.elements (
  element_id varchar(10) PRIMARY KEY,
  part_num varchar(20) NOT NULL REFERENCES catalog.parts (part_num) ON DELETE CASCADE,
  color_id integer NOT NULL REFERENCES catalog.colors (id) ON DELETE CASCADE
);

CREATE INDEX catalog_elements_part_color_idx ON catalog.elements (part_num, color_id);

-- parent/child part mold relationships (rel_type: e.g. alternate, counterpart)
CREATE TABLE catalog.part_relationships (
  rel_type varchar(1) NOT NULL,
  child_part_num varchar(20) NOT NULL REFERENCES catalog.parts (part_num) ON DELETE CASCADE,
  parent_part_num varchar(20) NOT NULL REFERENCES catalog.parts (part_num) ON DELETE CASCADE,
  PRIMARY KEY (rel_type, child_part_num, parent_part_num)
);

-- ---------------------------------------------------------------------------
-- BOM (bill of materials) — NOT business stock (see v_inventory_summary)
-- ---------------------------------------------------------------------------

CREATE TABLE catalog.inventories (
  id integer PRIMARY KEY,
  version integer NOT NULL,
  set_num varchar(20) NOT NULL REFERENCES catalog.sets (set_num) ON DELETE CASCADE
);

CREATE INDEX catalog_inventories_set_num_idx ON catalog.inventories (set_num);

CREATE TABLE catalog.inventory_parts (
  inventory_id integer NOT NULL REFERENCES catalog.inventories (id) ON DELETE CASCADE,
  part_num varchar(20) NOT NULL REFERENCES catalog.parts (part_num) ON DELETE CASCADE,
  color_id integer NOT NULL REFERENCES catalog.colors (id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity >= 0),
  is_spare boolean NOT NULL DEFAULT false,
  PRIMARY KEY (inventory_id, part_num, color_id, is_spare)
);

CREATE TABLE catalog.inventory_minifigs (
  inventory_id integer NOT NULL REFERENCES catalog.inventories (id) ON DELETE CASCADE,
  fig_num varchar(20) NOT NULL REFERENCES catalog.minifigs (fig_num) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (inventory_id, fig_num)
);

CREATE TABLE catalog.inventory_sets (
  inventory_id integer NOT NULL REFERENCES catalog.inventories (id) ON DELETE CASCADE,
  set_num varchar(20) NOT NULL REFERENCES catalog.sets (set_num) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (inventory_id, set_num)
);
