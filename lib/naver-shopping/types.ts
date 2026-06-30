export type NaverShoppingSort = "sim" | "date" | "asc" | "dsc";

export type NaverShoppingClientSort =
  | "api"
  | "effective_asc"
  | "effective_desc"
  | "mall"
  | "brand";

export interface ProductSearchOption {
  product_number: string;
  name: string;
}

export interface NaverShoppingSearchParams {
  query: string;
  display: number;
  start?: number;
  sort: NaverShoppingSort;
  filter?: "naverpay";
  exclude?: string;
}

export interface NaverShoppingApiItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  maker: string;
  brand: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

export interface NaverShoppingApiResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverShoppingApiItem[];
}

export interface NaverShoppingItem {
  query: string;
  productNumber: string | null;
  title: string;
  link: string;
  image: string | null;
  mallName: string;
  lprice: number;
  hprice: number;
  productId: string;
  productType: number;
  maker: string | null;
  brand: string | null;
  category1: string | null;
  category2: string | null;
  category3: string | null;
  category4: string | null;
  shippingFeeOverride: number | null;
  effectivePrice: number;
  suspicious: boolean;
  raw: NaverShoppingApiItem;
}

export interface NaverShoppingSearchResult {
  query: string;
  total: number;
  start: number;
  display: number;
  items: NaverShoppingItem[];
}

export interface NaverShoppingSearchInput {
  queries: string[];
  productNumber?: string;
  sort: NaverShoppingSort;
  display: number;
  filter?: "naverpay";
  excludeUsed: boolean;
  excludeOverseas: boolean;
  includeShipping: boolean;
}

export interface NaverShoppingSavedRun {
  id: string;
  queries: string[];
  sort: NaverShoppingSort;
  display: number;
  include_shipping: boolean;
  total: number;
  created_at: string;
}

export interface NaverShoppingWatchTarget {
  id: string;
  product_number: string | null;
  keyword: string;
  enabled: boolean;
  interval_minutes: number;
  last_run_at: string | null;
  next_run_at: string;
  sort: NaverShoppingSort;
  display: number;
  include_used: boolean;
  include_overseas: boolean;
  include_shipping: boolean;
  created_at: string;
}
