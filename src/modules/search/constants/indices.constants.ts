export const INDEX_NAMES = {
  PRODUCTS: 'ecommerce_products',
  CATEGORIES: 'ecommerce_categories',
  BRANDS: 'ecommerce_brands',
  ANALYTICS: 'ecommerce_search_analytics',
  SEARCH_QUERIES: 'ecommerce_search_queries',
  SUGGESTION_ANALYTICS: 'ecommerce_suggestion_analytics',
} as const;

export const INDEX_ALIASES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  BRANDS: 'brands',
  ANALYTICS: 'search_analytics',
  SEARCH_QUERIES: 'search_queries',
  SUGGESTION_ANALYTICS: 'suggestion_analytics',
} as const;

export const DEFAULT_SEARCH_SIZE = 20;
export const MAX_SEARCH_SIZE = 100;
export const DEFAULT_CACHE_TTL = 300; // 5 minutes
export const MAX_RESULT_WINDOW = 50000;

export const FACET_LIMITS = {
  CATEGORIES: 20,
  BRANDS: 20,
  PRICE_RANGES: 10,
  RATINGS: 5,
  TAGS: 15,
} as const;

export const SORT_OPTIONS = {
  RELEVANCE: '_score',
  PRICE_ASC: 'price:asc',
  PRICE_DESC: 'price:desc',
  RATING: 'rating.average:desc',
  NEWEST: 'created_at:desc',
  POPULARITY: 'popularity_score:desc',
} as const;

export const SEARCH_FIELDS = {
  PRODUCTS: {
    TITLE: 'title',
    DESCRIPTION: 'description',
    BRAND: 'brand.name',
    CATEGORY: 'category.name',
    KEYWORDS: 'search_keywords',
  },
  BOOST_VALUES: {
    TITLE: 3,
    BRAND: 2,
    KEYWORDS: 2,
    CATEGORY: 1.5,
    DESCRIPTION: 1,
  },
} as const;

export const ANALYZERS = {
  PRODUCT_ANALYZER: 'product_analyzer',
  SUGGEST_ANALYZER: 'suggest_analyzer',
  KEYWORD_ANALYZER: 'keyword_analyzer',
  SEARCH_ANALYZER: 'search_analyzer',
} as const;

export const FILTERS = {
  SYNONYM_FILTER: 'synonym_filter',
  STEMMER_FILTER: 'stemmer_filter',
  LOWERCASE_FILTER: 'lowercase',
  STOP_FILTER: 'stop',
  TRIM_FILTER: 'trim',
} as const;

export const HIGHLIGHT_CONFIG = {
  PRE_TAGS: ['<mark>'],
  POST_TAGS: ['</mark>'],
  FRAGMENT_SIZE: 150,
  NUMBER_OF_FRAGMENTS: 1,
  FIELDS: ['title', 'description', 'brand.name', 'category.name'],
} as const;

export const SUGGESTION_CONFIG = {
  MAX_SUGGESTIONS: 10,
  COMPLETION_SIZE: 5,
  PHRASE_SIZE: 3,
  TERM_SIZE: 3,
  AUTOCOMPLETE_SIZE: 10,
  FUZZY_PREFIX_LENGTH: 1,
  FUZZY_MAX_EXPANSIONS: 50,
  SPELL_CHECK_SIZE: 3,
  CACHE_TTL: 300, // 5 minutes
  POPULAR_QUERIES_SIZE: 10,
} as const;

export const BULK_CONFIG = {
  DEFAULT_BATCH_SIZE: 1000,
  MAX_BATCH_SIZE: 10000,
  TIMEOUT: '30s',
  REFRESH: 'wait_for',
} as const;

export const HEALTH_CHECK_CONFIG = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const PRICE_RANGES = [
  { key: '0-25', from: 0, to: 25 },
  { key: '25-50', from: 25, to: 50 },
  { key: '50-100', from: 50, to: 100 },
  { key: '100-250', from: 100, to: 250 },
  { key: '250-500', from: 250, to: 500 },
  { key: '500-1000', from: 500, to: 1000 },
  { key: '1000+', from: 1000 },
] as const;

export const RATING_RANGES = [
  { key: '4+', from: 4 },
  { key: '3+', from: 3 },
  { key: '2+', from: 2 },
  { key: '1+', from: 1 },
] as const;

export const ERROR_CODES = {
  INDEX_NOT_FOUND: 'index_not_found_exception',
  SEARCH_PHASE_EXECUTION: 'search_phase_execution_exception',
  PARSING: 'parsing_exception',
  TIMEOUT: 'timeout_exception',
  CONNECTION: 'connection_exception',
  AUTHENTICATION: 'security_exception',
} as const;

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
  BACKOFF_FACTOR: 2,
} as const;
