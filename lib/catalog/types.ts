import type { ProductStatus } from "@/lib/pricing/types";

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
