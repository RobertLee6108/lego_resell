-- Effective price calculation (mirrors lib/pricing/calculateEffectivePrice.ts)
-- Order: subtotal → instant/other (fixed then %) → card_charge % → cashback % on payment
CREATE OR REPLACE FUNCTION calculate_effective_price(
  p_sale_price integer,
  p_shipping integer,
  p_rules jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  effective_price integer,
  breakdown jsonb
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_amount numeric;
  v_subtotal numeric;
  v_payment_before_cashback numeric;
  v_cashback_total numeric := 0;
  v_deduction numeric;
  v_rule record;
  v_steps jsonb := '[]'::jsonb;
BEGIN
  v_subtotal := p_sale_price + p_shipping;
  v_amount := v_subtotal;

  v_steps := v_steps || jsonb_build_array(
    jsonb_build_object('step', 'subtotal', 'label', '판매가+배송', 'amount', round(v_subtotal))
  );

  -- instant / other: fixed first (apply_order asc)
  FOR v_rule IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_rules, '[]'::jsonb)) AS r(
      rule_type text,
      label text,
      percent numeric,
      fixed_amount integer,
      apply_order smallint,
      is_active boolean
    )
    WHERE COALESCE(is_active, true)
      AND rule_type IN ('instant', 'other')
      AND fixed_amount IS NOT NULL
      AND fixed_amount > 0
    ORDER BY apply_order, label
  LOOP
    v_deduction := v_rule.fixed_amount;
    v_amount := v_amount - v_deduction;
    v_steps := v_steps || jsonb_build_array(
      jsonb_build_object(
        'step', 'deduction_fixed',
        'rule_type', v_rule.rule_type,
        'label', v_rule.label,
        'deduction', round(v_deduction),
        'remaining', round(greatest(v_amount, 0))
      )
    );
  END LOOP;

  -- instant / other: percent (apply_order asc)
  FOR v_rule IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_rules, '[]'::jsonb)) AS r(
      rule_type text,
      label text,
      percent numeric,
      fixed_amount integer,
      apply_order smallint,
      is_active boolean
    )
    WHERE COALESCE(is_active, true)
      AND rule_type IN ('instant', 'other')
      AND percent IS NOT NULL
      AND percent > 0
    ORDER BY apply_order, label
  LOOP
    v_deduction := v_amount * (v_rule.percent / 100.0);
    v_amount := v_amount - v_deduction;
    v_steps := v_steps || jsonb_build_array(
      jsonb_build_object(
        'step', 'deduction_percent',
        'rule_type', v_rule.rule_type,
        'label', v_rule.label,
        'percent', v_rule.percent,
        'deduction', round(v_deduction),
        'remaining', round(greatest(v_amount, 0))
      )
    );
  END LOOP;

  -- card_charge: % on remaining (청구할인)
  FOR v_rule IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_rules, '[]'::jsonb)) AS r(
      rule_type text,
      label text,
      percent numeric,
      fixed_amount integer,
      apply_order smallint,
      is_active boolean
    )
    WHERE COALESCE(is_active, true)
      AND rule_type = 'card_charge'
      AND percent IS NOT NULL
      AND percent > 0
    ORDER BY apply_order, label
  LOOP
    v_deduction := v_amount * (v_rule.percent / 100.0);
    v_amount := v_amount - v_deduction;
    v_steps := v_steps || jsonb_build_array(
      jsonb_build_object(
        'step', 'card_charge',
        'label', v_rule.label,
        'percent', v_rule.percent,
        'deduction', round(v_deduction),
        'remaining', round(greatest(v_amount, 0))
      )
    );
  END LOOP;

  v_payment_before_cashback := greatest(v_amount, 0);
  v_steps := v_steps || jsonb_build_array(
    jsonb_build_object(
      'step', 'payment_before_cashback',
      'label', '결제 예상액',
      'amount', round(v_payment_before_cashback)
    )
  );

  -- cashback: % of payment → reduces effective price
  FOR v_rule IN
    SELECT *
    FROM jsonb_to_recordset(COALESCE(p_rules, '[]'::jsonb)) AS r(
      rule_type text,
      label text,
      percent numeric,
      fixed_amount integer,
      apply_order smallint,
      is_active boolean
    )
    WHERE COALESCE(is_active, true)
      AND rule_type = 'cashback'
      AND percent IS NOT NULL
      AND percent > 0
    ORDER BY apply_order, label
  LOOP
    v_deduction := v_payment_before_cashback * (v_rule.percent / 100.0);
    v_cashback_total := v_cashback_total + v_deduction;
    v_steps := v_steps || jsonb_build_array(
      jsonb_build_object(
        'step', 'cashback',
        'label', v_rule.label,
        'percent', v_rule.percent,
        'deduction', round(v_deduction)
      )
    );
  END LOOP;

  v_amount := greatest(v_payment_before_cashback - v_cashback_total, 0);

  v_steps := v_steps || jsonb_build_array(
    jsonb_build_object('step', 'effective_price', 'label', '체감 실구매가', 'amount', round(v_amount))
  );

  effective_price := round(v_amount)::integer;
  breakdown := jsonb_build_object('steps', v_steps);
  RETURN NEXT;
END;
$$;

-- Comparison view for catalog / detail pages
CREATE OR REPLACE VIEW v_product_price_comparison AS
SELECT
  p.product_number,
  p.name AS product_name,
  p.msrp,
  p.status AS product_status,
  pl.id AS listing_id,
  pl.sale_price,
  pl.shipping_fee,
  pl.product_url,
  pl.in_stock,
  pl.last_checked_at,
  r.id AS retailer_id,
  r.name AS retailer_name,
  r.slug AS retailer_slug,
  r.logo_url AS retailer_logo_url,
  calc.effective_price,
  calc.breakdown,
  (p.msrp - calc.effective_price) AS savings_vs_msrp,
  CASE
    WHEN p.msrp > 0 THEN round((calc.effective_price::numeric / p.msrp) * 100, 1)
    ELSE NULL
  END AS effective_vs_msrp_pct
FROM products p
JOIN product_listings pl ON pl.product_number = p.product_number
JOIN retailers r ON r.id = pl.retailer_id
CROSS JOIN LATERAL calculate_effective_price(
  pl.sale_price,
  pl.shipping_fee,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'rule_type', ldr.rule_type,
          'label', ldr.label,
          'percent', ldr.percent,
          'fixed_amount', ldr.fixed_amount,
          'apply_order', ldr.apply_order,
          'is_active', ldr.is_active
        )
        ORDER BY ldr.apply_order, ldr.label
      )
      FROM listing_discount_rules ldr
      WHERE ldr.listing_id = pl.id AND ldr.is_active = true
    ),
    '[]'::jsonb
  )
) AS calc;
