-- Sample themes, retailers, products, listings, discount rules (dev only)

INSERT INTO themes (id, name, slug) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Icons', 'icons'),
  ('a0000001-0000-4000-8000-000000000002', 'Creator Expert', 'creator-expert');

INSERT INTO retailers (id, name, slug, base_url) VALUES
  ('b0000001-0000-4000-8000-000000000001', '쿠팡', 'coupang', 'https://www.coupang.com'),
  ('b0000001-0000-4000-8000-000000000002', '11번가', '11st', 'https://www.11st.co.kr'),
  ('b0000001-0000-4000-8000-000000000003', 'G마켓', 'gmarket', 'https://www.gmarket.co.kr');

INSERT INTO products (
  product_number, name, msrp, status, release_date, theme_id, image_url
) VALUES
  (
    '10316',
    '스누피와 우드스톡',
    169900,
    'on_sale',
    '2024-02-01',
    'a0000001-0000-4000-8000-000000000001',
    NULL
  ),
  (
    '10294',
    'Ghostbusters ECTO-1',
    269900,
    'retiring_soon',
    '2021-06-01',
    'a0000001-0000-4000-8000-000000000002',
    NULL
  );

INSERT INTO product_listings (
  id, product_number, retailer_id, sale_price, shipping_fee, product_url, in_stock
) VALUES
  (
    'c0000001-0000-4000-8000-000000000001',
    '10316',
    'b0000001-0000-4000-8000-000000000001',
    152000,
    0,
    'https://www.coupang.com/example-10316',
    true
  ),
  (
    'c0000001-0000-4000-8000-000000000002',
    '10316',
    'b0000001-0000-4000-8000-000000000002',
    154900,
    3000,
    'https://www.11st.co.kr/example-10316',
    true
  ),
  (
    'c0000001-0000-4000-8000-000000000003',
    '10316',
    'b0000001-0000-4000-8000-000000000003',
    149000,
    0,
    'https://www.gmarket.co.kr/example-10316',
    true
  ),
  (
    'c0000001-0000-4000-8000-000000000004',
    '10294',
    'b0000001-0000-4000-8000-000000000001',
    289000,
    0,
    'https://www.coupang.com/example-10294',
    false
  );

INSERT INTO listing_discount_rules (
  listing_id, rule_type, label, percent, fixed_amount, apply_order, is_active
) VALUES
  -- Coupang 10316: instant 3%, SS card 7%, cashback 2%
  (
    'c0000001-0000-4000-8000-000000000001',
    'instant',
    '즉시할인 3%',
    3.00,
    NULL,
    1,
    true
  ),
  (
    'c0000001-0000-4000-8000-000000000001',
    'card_charge',
    'SS카드 청구 7%',
    7.00,
    NULL,
    2,
    true
  ),
  (
    'c0000001-0000-4000-8000-000000000001',
    'cashback',
    '쿠팡캐시 2%',
    2.00,
    NULL,
    3,
    true
  ),
  -- 11st 10316: coupon 5000, card 5%
  (
    'c0000001-0000-4000-8000-000000000002',
    'other',
    '쿠폰 5,000원',
    NULL,
    5000,
    1,
    true
  ),
  (
    'c0000001-0000-4000-8000-000000000002',
    'card_charge',
    '삼성카드 5%',
    5.00,
    NULL,
    2,
    true
  ),
  -- Gmarket 10316: instant 5%
  (
    'c0000001-0000-4000-8000-000000000003',
    'instant',
    'G마켓 할인 5%',
    5.00,
    NULL,
    1,
    true
  );
