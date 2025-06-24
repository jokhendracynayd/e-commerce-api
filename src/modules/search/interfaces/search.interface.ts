export interface SearchQuery {
  q?: string; // Search query text
  category?: string[]; // Category filters
  brand?: string[]; // Brand filters
  price_min?: number; // Minimum price filter
  price_max?: number; // Maximum price filter
  rating_min?: number; // Minimum rating filter
  in_stock?: boolean; // Stock availability filter
  sort?:
    | 'relevance'
    | 'price_asc'
    | 'price_desc'
    | 'rating'
    | 'newest'
    | 'popularity';
  page?: number; // Page number for pagination
  limit?: number; // Results per page (max 100)
  facets?: boolean; // Include facets in response
  user_id?: string; // For personalization
  session_id?: string; // For analytics
}

export interface SearchResponse<T = any> {
  hits: {
    total: {
      value: number;
      relation: 'eq' | 'gte';
    };
    max_score?: number;
    hits: SearchHit<T>[];
  };
  facets?: SearchFacets;
  suggestions?: SearchSuggestion[];
  took: number; // Query execution time in ms
  timed_out: boolean;
  pagination: {
    current_page: number;
    total_pages: number;
    page_size: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface SearchHit<T = any> {
  _index: string;
  _id: string;
  _score: number;
  _source: T;
  highlight?: Record<string, string[]>;
  sort?: any[];
}

export interface SearchFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  price_ranges: FacetBucket[];
  ratings: FacetBucket[];
  tags?: FacetBucket[];
}

export interface FacetBucket {
  key: string;
  doc_count: number;
  selected?: boolean;
}

export interface SearchSuggestion {
  text: string;
  score: number;
  type: 'product' | 'category' | 'brand' | 'query';
  id?: string;
}

export interface AutocompleteQuery {
  q: string;
  types?: ('products' | 'categories' | 'brands')[];
  limit?: number;
}

export interface AutocompleteResponse {
  products: ProductSuggestion[];
  categories: CategorySuggestion[];
  brands: BrandSuggestion[];
  corrections?: SpellCorrection[];
  took: number;
}

export interface ProductSuggestion {
  text: string;
  score: number;
  product_id: string;
  category?: string;
  price?: number;
  image_url?: string;
}

export interface CategorySuggestion {
  text: string;
  category_id: string;
  product_count?: number;
}

export interface BrandSuggestion {
  text: string;
  brand_id: string;
  product_count?: number;
}

export interface SpellCorrection {
  original: string;
  suggested: string;
  confidence: number;
}

export interface SearchFilters {
  categories?: string[];
  brands?: string[];
  price_range?: {
    min?: number;
    max?: number;
  };
  rating_min?: number;
  in_stock?: boolean;
  tags?: string[];
  is_featured?: boolean;
  is_active?: boolean;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
  mode?: 'min' | 'max' | 'sum' | 'avg' | 'median';
}

export interface HighlightOptions {
  fields: string[];
  pre_tags?: string[];
  post_tags?: string[];
  fragment_size?: number;
  number_of_fragments?: number;
}

export interface SearchConfiguration {
  index_name: string;
  default_size: number;
  max_size: number;
  enable_highlighting: boolean;
  enable_suggestions: boolean;
  enable_facets: boolean;
  cache_ttl: number;
  timeout: number;
}

export interface ElasticsearchHealth {
  cluster_name: string;
  status: 'green' | 'yellow' | 'red';
  timed_out: boolean;
  number_of_nodes: number;
  number_of_data_nodes: number;
  active_primary_shards: number;
  active_shards: number;
  relocating_shards: number;
  initializing_shards: number;
  unassigned_shards: number;
  delayed_unassigned_shards: number;
  number_of_pending_tasks: number;
  number_of_in_flight_fetch: number;
  task_max_waiting_in_queue_millis: number;
  active_shards_percent_as_number: number;
}

export interface IndexHealth {
  index: string;
  status: 'green' | 'yellow' | 'red';
  number_of_shards: number;
  number_of_replicas: number;
  active_primary_shards: number;
  active_shards: number;
  relocating_shards: number;
  initializing_shards: number;
  unassigned_shards: number;
}

export interface BulkIndexOperation {
  index: {
    _index: string;
    _id: string;
  };
}

export interface BulkIndexResponse {
  took: number;
  errors: boolean;
  items: BulkIndexItem[];
}

export interface BulkIndexItem {
  index?: {
    _index: string;
    _id: string;
    _version: number;
    result: string;
    _shards: {
      total: number;
      successful: number;
      failed: number;
    };
    status: number;
    error?: any;
  };
  delete?: {
    _index: string;
    _id: string;
    _version: number;
    result: string;
    _shards: {
      total: number;
      successful: number;
      failed: number;
    };
    status: number;
    error?: any;
  };
}

export interface SearchMetrics {
  query_text?: string;
  results_count: number;
  response_time: number;
  filters_used: number;
  user_id?: string;
  session_id?: string;
  timestamp: Date;
  index_name: string;
  took: number;
  timed_out: boolean;
}

export interface SearchAnalytics {
  total_searches: number;
  average_response_time: number;
  zero_result_queries: number;
  popular_queries: Array<{
    query: string;
    count: number;
  }>;
  popular_filters: Array<{
    filter: string;
    count: number;
  }>;
  conversion_rate: number;
}

export interface SearchError {
  type: string;
  reason: string;
  caused_by?: SearchError;
  root_cause?: SearchError[];
  status?: number;
}
