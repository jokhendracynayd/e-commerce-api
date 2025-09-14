import { IndexMapping, IndexSettings } from '../interfaces/index.interface';

export const PRODUCT_MAPPING: IndexMapping = {
  properties: {
    id: { type: 'keyword' },
    sku: { type: 'keyword' },
    slug: { type: 'keyword' },
    title: {
      type: 'text',
      analyzer: 'product_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        suggest: {
          type: 'completion',
          analyzer: 'suggest_analyzer',
        },
        autocomplete: {
          type: 'completion',
          analyzer: 'suggest_analyzer',
        },
      },
    },
    description: {
      type: 'text',
      analyzer: 'product_analyzer',
    },
    category: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          analyzer: 'keyword_analyzer',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        path: { type: 'keyword' },
      },
    },
    brand: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        name: {
          type: 'text',
          analyzer: 'keyword_analyzer',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
      },
    },
    price: {
      type: 'scaled_float',
      scaling_factor: 100,
    },
    discount_price: {
      type: 'scaled_float',
      scaling_factor: 100,
    },
    in_stock: { type: 'boolean' },
    stock_quantity: { type: 'integer' },
    rating: {
      type: 'object',
      properties: {
        average: { type: 'float' },
        count: { type: 'integer' },
      },
    },
    tags: {
      type: 'keyword',
    },
    images: { type: 'keyword' },
    created_at: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
    updated_at: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
    is_active: { type: 'boolean' },
    is_featured: { type: 'boolean' },
    search_keywords: {
      type: 'text',
      analyzer: 'keyword_analyzer',
    },
    popularity_score: { type: 'float' },
    conversion_rate: { type: 'float' },
    specifications: {
      type: 'object',
      dynamic: true,
    },
    variants: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        sku: { type: 'keyword' },
        price: {
          type: 'scaled_float',
          scaling_factor: 100,
        },
        stock_quantity: { type: 'integer' },
        attributes: {
          type: 'object',
          dynamic: true,
        },
      },
    },
  },
  dynamic: 'strict',
  date_detection: false,
  numeric_detection: false,
};

export const PRODUCT_SETTINGS: IndexSettings = {
  number_of_shards: 3,
  number_of_replicas: 1,
  refresh_interval: '30s',
  max_result_window: 50000,
  analysis: {
    analyzer: {
      product_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'stop', 'synonym_filter', 'stemmer'],
      },
      suggest_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
      keyword_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
      search_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'stop', 'synonym_filter'],
      },
    },
    filter: {
      synonym_filter: {
        type: 'synonym',
        synonyms: [
          'phone,mobile,smartphone',
          'laptop,notebook,computer',
          'tv,television',
          'headphones,earphones,earbuds',
          'watch,timepiece',
        ],
      },
    },
  },
  mapping: {
    total_fields: {
      limit: 2000,
    },
    depth: {
      limit: 20,
    },
  },
};

export const CATEGORY_MAPPING: IndexMapping = {
  properties: {
    id: { type: 'keyword' },
    name: {
      type: 'text',
      analyzer: 'keyword_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        suggest: {
          type: 'completion',
        },
      },
    },
    slug: { type: 'keyword' },
    description: {
      type: 'text',
      analyzer: 'keyword_analyzer',
    },
    parent_id: { type: 'keyword' },
    level: { type: 'integer' },
    path: { type: 'keyword' },
    product_count: { type: 'integer' },
    is_active: { type: 'boolean' },
    sort_order: { type: 'integer' },
  },
  dynamic: 'strict',
  date_detection: false,
  numeric_detection: false,
};

export const CATEGORY_SETTINGS: IndexSettings = {
  number_of_shards: 1,
  number_of_replicas: 1,
  refresh_interval: '60s',
  max_result_window: 10000,
  analysis: {
    analyzer: {
      keyword_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
      suggest_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
      product_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'stop', 'stemmer'],
      },
    },
  },
};

export const BRAND_MAPPING: IndexMapping = {
  properties: {
    id: { type: 'keyword' },
    name: {
      type: 'text',
      analyzer: 'keyword_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        suggest: {
          type: 'completion',
          analyzer: 'suggest_analyzer',
        },
      },
    },
    slug: { type: 'keyword' },
    description: {
      type: 'text',
      analyzer: 'product_analyzer',
    },
    logo_url: { type: 'keyword' },
    website: { type: 'keyword' },
    is_featured: { type: 'boolean' },
    product_count: { type: 'integer' },
    is_active: { type: 'boolean' },
  },
  dynamic: 'strict',
  date_detection: false,
  numeric_detection: false,
};

export const BRAND_SETTINGS: IndexSettings = {
  number_of_shards: 1,
  number_of_replicas: 1,
  refresh_interval: '60s',
  max_result_window: 10000,
  analysis: {
    analyzer: {
      keyword_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
      suggest_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
      product_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'stop', 'stemmer'],
      },
    },
  },
};

export const ANALYTICS_MAPPING: IndexMapping = {
  properties: {
    id: { type: 'keyword' },
    query_text: {
      type: 'text',
      analyzer: 'keyword_analyzer',
    },
    user_id: { type: 'keyword' },
    session_id: { type: 'keyword' },
    results_count: { type: 'integer' },
    response_time: { type: 'integer' },
    clicked_result_id: { type: 'keyword' },
    clicked_position: { type: 'integer' },
    filters_applied: { type: 'keyword' },
    timestamp: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
    index_name: { type: 'keyword' },
    ip_address: { type: 'ip' },
    user_agent: {
      type: 'text',
      index: false,
    },
  },
  dynamic: 'strict',
  date_detection: false,
  numeric_detection: false,
};

export const ANALYTICS_SETTINGS: IndexSettings = {
  number_of_shards: 2,
  number_of_replicas: 0,
  refresh_interval: '5s',
  max_result_window: 10000,
  analysis: {
    analyzer: {
      keyword_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
    },
  },
};

// Search Queries mapping for popular query suggestions
export const SEARCH_QUERIES_MAPPING: IndexMapping = {
  properties: {
    id: { type: 'keyword' },
    query: {
      type: 'text',
      analyzer: 'keyword_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        suggest: {
          type: 'completion',
          analyzer: 'suggest_analyzer',
        },
      },
    },
    frequency: { type: 'integer' },
    result_count: { type: 'integer' },
    last_searched: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
    created_at: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
    updated_at: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
  },
  dynamic: 'strict',
  date_detection: false,
  numeric_detection: false,
};

export const SEARCH_QUERIES_SETTINGS: IndexSettings = {
  number_of_shards: 1,
  number_of_replicas: 1,
  refresh_interval: '30s',
  max_result_window: 10000,
  analysis: {
    analyzer: {
      keyword_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
      suggest_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
    },
  },
};

// Suggestion Analytics mapping for tracking suggestion usage
export const SUGGESTION_ANALYTICS_MAPPING: IndexMapping = {
  properties: {
    id: { type: 'keyword' },
    timestamp: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
    query: {
      type: 'text',
      analyzer: 'keyword_analyzer',
    },
    types_requested: { type: 'keyword' },
    total_suggestions: { type: 'integer' },
    has_corrections: { type: 'boolean' },
    user_id: { type: 'keyword' },
    session_id: { type: 'keyword' },
    response_time: { type: 'integer' },
    suggestion_clicked: { type: 'keyword' },
    suggestion_type: { type: 'keyword' },
    suggestion_position: { type: 'integer' },
  },
  dynamic: 'strict',
  date_detection: false,
  numeric_detection: false,
};

export const SUGGESTION_ANALYTICS_SETTINGS: IndexSettings = {
  number_of_shards: 1,
  number_of_replicas: 0,
  refresh_interval: '5s',
  max_result_window: 10000,
  analysis: {
    analyzer: {
      keyword_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'trim'],
      },
    },
  },
};

export const INDEX_CONFIGURATIONS = {
  products: {
    index: 'ecommerce_products',
    mapping: PRODUCT_MAPPING,
    settings: PRODUCT_SETTINGS,
  },
  categories: {
    index: 'ecommerce_categories',
    mapping: CATEGORY_MAPPING,
    settings: CATEGORY_SETTINGS,
  },
  brands: {
    index: 'ecommerce_brands',
    mapping: BRAND_MAPPING,
    settings: BRAND_SETTINGS,
  },
  analytics: {
    index: 'ecommerce_search_analytics',
    mapping: ANALYTICS_MAPPING,
    settings: ANALYTICS_SETTINGS,
  },
  search_queries: {
    index: 'ecommerce_search_queries',
    mapping: SEARCH_QUERIES_MAPPING,
    settings: SEARCH_QUERIES_SETTINGS,
  },
  suggestion_analytics: {
    index: 'ecommerce_suggestion_analytics',
    mapping: SUGGESTION_ANALYTICS_MAPPING,
    settings: SUGGESTION_ANALYTICS_SETTINGS,
  },
} as const;
