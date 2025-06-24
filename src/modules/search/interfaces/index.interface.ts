export interface IndexMapping {
  properties: Record<string, FieldMapping>;
  dynamic?: boolean | 'strict';
  date_detection?: boolean;
  numeric_detection?: boolean;
}

export interface FieldMapping {
  type:
    | 'text'
    | 'keyword'
    | 'integer'
    | 'long'
    | 'float'
    | 'double'
    | 'boolean'
    | 'date'
    | 'object'
    | 'nested'
    | 'completion'
    | 'scaled_float'
    | 'ip';
  analyzer?: string;
  search_analyzer?: string;
  index?: boolean;
  store?: boolean;
  doc_values?: boolean;
  fields?: Record<string, FieldMapping>;
  properties?: Record<string, FieldMapping>;
  scaling_factor?: number;
  format?: string;
  boost?: number;
  null_value?: any;
  copy_to?: string | string[];
  dynamic?: boolean | 'strict';
  // Completion-specific fields
  contexts?: Array<{
    name: string;
    type: 'category' | 'geo';
    path?: string;
    precision?: string | number;
  }>;
}

export interface IndexSettings {
  number_of_shards?: number;
  number_of_replicas?: number;
  refresh_interval?: string;
  max_result_window?: number;
  analysis?: AnalysisSettings;
  mapping?: {
    total_fields?: {
      limit?: number;
    };
    depth?: {
      limit?: number;
    };
  };
}

export interface AnalysisSettings {
  analyzer?: Record<string, AnalyzerDefinition>;
  tokenizer?: Record<string, TokenizerDefinition>;
  filter?: Record<string, FilterDefinition>;
  normalizer?: Record<string, NormalizerDefinition>;
}

export interface AnalyzerDefinition {
  type?: string;
  tokenizer: string;
  filter?: string[];
  char_filter?: string[];
}

export interface TokenizerDefinition {
  type: string;
  pattern?: string;
  flags?: string;
}

export interface FilterDefinition {
  type: string;
  synonyms?: string[];
  synonyms_path?: string;
  lenient?: boolean;
  stopwords?: string | string[];
  stopwords_path?: string;
}

export interface NormalizerDefinition {
  type?: string;
  filter: string[];
}

export interface IndexTemplate {
  name: string;
  index_patterns: string[];
  template: {
    settings: IndexSettings;
    mappings: IndexMapping;
  };
  priority?: number;
  version?: number;
}

export interface IndexOperation {
  action: 'create' | 'update' | 'delete' | 'reindex';
  index_name: string;
  mapping?: IndexMapping;
  settings?: IndexSettings;
  alias?: string[];
}

export interface IndexStats {
  _all: {
    primaries: ShardStats;
    total: ShardStats;
  };
  indices: Record<
    string,
    {
      primaries: ShardStats;
      total: ShardStats;
    }
  >;
}

export interface ShardStats {
  docs: {
    count: number;
    deleted: number;
  };
  store: {
    size_in_bytes: number;
    reserved_in_bytes?: number;
  };
  indexing: {
    index_total: number;
    index_time_in_millis: number;
    index_current: number;
    index_failed: number;
    delete_total: number;
    delete_time_in_millis: number;
    delete_current: number;
    noop_update_total: number;
    is_throttled: boolean;
    throttle_time_in_millis: number;
  };
  search: {
    query_total: number;
    query_time_in_millis: number;
    query_current: number;
    fetch_total: number;
    fetch_time_in_millis: number;
    fetch_current: number;
    scroll_total: number;
    scroll_time_in_millis: number;
    scroll_current: number;
    suggest_total: number;
    suggest_time_in_millis: number;
    suggest_current: number;
  };
}

export interface ReindexOperation {
  source: {
    index: string;
    query?: any;
    size?: number;
  };
  dest: {
    index: string;
    version_type?: 'internal' | 'external' | 'external_gte';
  };
  script?: {
    source: string;
    lang?: string;
    params?: Record<string, any>;
  };
  conflicts?: 'abort' | 'proceed';
}

export interface ReindexResponse {
  took: number;
  timed_out: boolean;
  total: number;
  updated: number;
  deleted: number;
  batches: number;
  version_conflicts: number;
  noops: number;
  retries: {
    bulk: number;
    search: number;
  };
  throttled_millis: number;
  requests_per_second: number;
  throttled_until_millis: number;
  failures: any[];
}

export interface AliasOperation {
  add?: {
    index: string;
    alias: string;
    filter?: any;
    routing?: string;
    search_routing?: string;
    index_routing?: string;
  };
  remove?: {
    index: string;
    alias: string;
  };
  remove_index?: {
    index: string;
  };
}

export interface ProductDocument {
  id: string;
  title: string;
  description?: string;
  category: {
    id: string;
    name: string;
    path: string;
  };
  brand: {
    id: string;
    name: string;
  };
  price: number;
  discount_price?: number;
  in_stock: boolean;
  stock_quantity: number;
  rating: {
    average: number;
    count: number;
  };
  tags: string[];
  images: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_featured: boolean;
  search_keywords: string;
  popularity_score: number;
  conversion_rate: number;
  specifications?: Record<string, any>;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  stock_quantity: number;
  attributes: Record<string, string>;
}

export interface CategoryDocument {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  level: number;
  path: string;
  product_count: number;
  is_active: boolean;
  sort_order: number;
}

export interface BrandDocument {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  is_featured: boolean;
  product_count: number;
  is_active: boolean;
}

export interface SearchAnalyticsDocument {
  id: string;
  query_text?: string;
  user_id?: string;
  session_id?: string;
  results_count: number;
  response_time: number;
  clicked_result_id?: string;
  clicked_position?: number;
  filters_applied: string[];
  timestamp: string;
  index_name: string;
  ip_address?: string;
  user_agent?: string;
}

export interface IndexConfiguration {
  products: {
    index: string;
    mapping: IndexMapping;
    settings: IndexSettings;
  };
  categories: {
    index: string;
    mapping: IndexMapping;
    settings: IndexSettings;
  };
  brands: {
    index: string;
    mapping: IndexMapping;
    settings: IndexSettings;
  };
  analytics: {
    index: string;
    mapping: IndexMapping;
    settings: IndexSettings;
  };
}

export interface IndexCreationResult {
  acknowledged: boolean;
  shards_acknowledged: boolean;
  index: string;
}
