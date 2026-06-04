-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE product_status AS ENUM (
  'on_sale',
  'retiring_soon',
  'discontinued'
);

CREATE TYPE discount_rule_type AS ENUM (
  'instant',
  'card_charge',
  'cashback',
  'other'
);
