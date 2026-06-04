-- Themes (series)
CREATE TABLE themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Retailers
CREATE TABLE retailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  base_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products (product_number = set number PK)
CREATE TABLE products (
  product_number text PRIMARY KEY,
  name text NOT NULL,
  msrp integer NOT NULL CHECK (msrp >= 0),
  status product_status NOT NULL DEFAULT 'on_sale',
  release_date date,
  theme_id uuid REFERENCES themes(id) ON DELETE SET NULL,
  image_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_theme_id_status_idx ON products (theme_id, status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
