import type { DiscountRuleInput, ProductStatus } from "@/lib/pricing/types";

export interface ThemeFormInput {
  name: string;
}

export interface ProductFormInput {
  product_number: string;
  name: string;
  msrp: number;
  status: ProductStatus;
  theme_id: string | null;
  release_date: string | null;
}

export interface ProductUpdateInput {
  product_number: string;
  name: string;
  msrp: number;
  status: ProductStatus;
  theme_id: string | null;
  release_date: string | null;
}

export interface ListingCreateInput {
  product_number: string;
  retailer_id: string;
  sale_price: number;
  shipping_fee: number;
  product_url?: string | null;
  in_stock?: boolean;
}

export interface ListingSaveInput {
  listing_id: string;
  sale_price: number;
  shipping_fee: number;
  product_url?: string | null;
  in_stock?: boolean;
  rules: DiscountRuleInput[];
}
