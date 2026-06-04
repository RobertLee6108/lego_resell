export type DiscountRuleType =
  | "instant"
  | "card_charge"
  | "cashback"
  | "other";

export type ProductStatus = "on_sale" | "retiring_soon" | "discontinued";

export interface DiscountRuleInput {
  rule_type: DiscountRuleType;
  label: string;
  percent?: number | null;
  fixed_amount?: number | null;
  apply_order: number;
  is_active?: boolean;
}

export type BreakdownStep =
  | {
      step: "subtotal";
      label: string;
      amount: number;
    }
  | {
      step: "deduction_fixed";
      rule_type: string;
      label: string;
      deduction: number;
      remaining: number;
    }
  | {
      step: "deduction_percent";
      rule_type: string;
      label: string;
      percent: number;
      deduction: number;
      remaining: number;
    }
  | {
      step: "card_charge";
      label: string;
      percent: number;
      deduction: number;
      remaining: number;
    }
  | {
      step: "payment_before_cashback";
      label: string;
      amount: number;
    }
  | {
      step: "cashback";
      label: string;
      percent: number;
      deduction: number;
    }
  | {
      step: "effective_price";
      label: string;
      amount: number;
    };

export interface PriceBreakdown {
  steps: BreakdownStep[];
}

export interface EffectivePriceResult {
  effective_price: number;
  breakdown: PriceBreakdown;
}

export interface ListingWithRules {
  listing_id: string;
  retailer_id: string;
  retailer_name: string;
  retailer_slug: string;
  retailer_logo_url: string | null;
  sale_price: number;
  shipping_fee: number;
  product_url: string | null;
  in_stock: boolean;
  rules: DiscountRuleInput[];
}
