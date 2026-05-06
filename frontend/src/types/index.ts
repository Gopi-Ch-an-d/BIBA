export interface Competitor {
  id: number;
  name: string;
  code: string;
  base_url: string;
  scraper_name: string;
  is_active: boolean;
  categories: Category[];
  inserted_datetime: string;
  updated_datetime: string;
}

export interface Category {
  id: number;
  competitor_id: number;
  name: string;
  slug: string;
  url: string;
  is_active: boolean;
}

export interface Product {
  is_new_launch: any;
  is_bestseller: any;
  id: number;
  competitor_id: number;
  category_id?: number;
  sku: string;
  name: string;
  category: string;
  current_price: number;
  original_price: number;
  discount_pct: number;
  stock_available: boolean;
  image_url: string;
  product_url: string;
  total_quantity?: number;
  is_quantity_disclose?: boolean;
  first_seen_at: string;
  last_updated_at: string;
  is_active: boolean;
}

export interface ProductListResponse {
  total: number;
  products: Product[];
}

export interface PriceHistoryPoint {
  scraped_at: string;
  price: number;
  original_price: number;
  discount_pct: number;
}

export interface NewArrivalTrendPoint {
  date: string;
  count: number;
  competitor_name: string;
}

export interface PriceHistoryRecord {
  record_id: number;
  source: string;
  product_id: number;
  competitor_id: number;
  sku: string;
  price: number;
  original_price: number;
  discount_pct: number;
  stock_available: boolean;
  scraped_at: string;
}

export interface CompetitorOverviewCard {
  competitor_id: number;
  competitor_name: string;
  total_products: number;
  avg_price?: number;
  avg_discount_pct?: number;
  new_arrivals_count: number;
  bestsellers_count: number;
  out_of_stock_count: number;
  daily_new_products_count: number;
  last_scraped_at?: string;
}

export interface ScrapeLog {
  id: number;
  competitor_id: number;
  scrape_type: string;
  total_products: number;
  new_products: number;
  updated_products: number;
  status: string;
  message?: string;
  inserted_datetime: string;
}

export interface ProductSize {
  record_id: number;
  size: string;
  quantity: number;
  is_available: boolean;
  last_updated_at: string;
}

export interface SizeHistoryRecord {
  record_id: number;
  source: string;
  product_id: number;
  size: string;
  quantity: number;
  is_available: boolean;
  captured_at: string;
}
