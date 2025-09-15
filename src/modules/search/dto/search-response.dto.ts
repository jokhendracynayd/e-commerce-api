import { ApiProperty } from '@nestjs/swagger';

export class ProductSearchResult {
  @ApiProperty({ description: 'Product ID' })
  id: string;

  @ApiProperty({ description: 'Product title' })
  title: string;

  @ApiProperty({ description: 'Product description', required: false })
  description?: string;

  @ApiProperty({ description: 'Product SKU' })
  sku: string;

  @ApiProperty({ description: 'Product slug' })
  slug: string;

  @ApiProperty({ description: 'Product price' })
  price: number;

  @ApiProperty({ description: 'Discounted price', required: false })
  discount_price?: number;

  @ApiProperty({ description: 'Currency code (USD, INR, EUR, etc.)', required: false })
  currency?: string;

  @ApiProperty({ description: 'Stock availability' })
  in_stock: boolean;

  @ApiProperty({ description: 'Stock quantity' })
  stock_quantity: number;

  @ApiProperty({ description: 'Product is active' })
  is_active: boolean;

  @ApiProperty({ description: 'Product is featured' })
  is_featured: boolean;

  @ApiProperty({ description: 'Product images' })
  images: string[];

  @ApiProperty({ description: 'Product tags' })
  tags: string[];

  @ApiProperty({ description: 'Product category', required: false })
  category?: {
    id: string;
    name: string;
    path: string;
  };

  @ApiProperty({ description: 'Product brand', required: false })
  brand?: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Product rating' })
  rating: {
    average: number;
    count: number;
  };

  @ApiProperty({ description: 'Product variants', required: false })
  variants?: Array<{
    id: string;
    sku: string;
    price: number;
    stock_quantity: number;
    attributes: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Search relevance score' })
  _score?: number;

  @ApiProperty({ description: 'Created date' })
  created_at: string;

  @ApiProperty({ description: 'Updated date' })
  updated_at: string;
}

export class FacetBucket {
  @ApiProperty({ description: 'Facet key/value' })
  key: string;

  @ApiProperty({ description: 'Document count for this facet' })
  doc_count: number;

  @ApiProperty({ description: 'Additional facet data', required: false })
  data?: any;
}

export class PriceRangeFacet {
  @ApiProperty({ description: 'Range key' })
  key: string;

  @ApiProperty({ description: 'From price' })
  from: number;

  @ApiProperty({ description: 'To price', required: false })
  to?: number;

  @ApiProperty({ description: 'Document count in this range' })
  doc_count: number;
}

export class SearchFacets {
  @ApiProperty({
    description: 'Category facets',
    type: [FacetBucket],
    required: false,
  })
  categories?: FacetBucket[];

  @ApiProperty({
    description: 'Brand facets',
    type: [FacetBucket],
    required: false,
  })
  brands?: FacetBucket[];

  @ApiProperty({
    description: 'Price range facets',
    type: [PriceRangeFacet],
    required: false,
  })
  price_ranges?: PriceRangeFacet[];

  @ApiProperty({
    description: 'Rating facets',
    type: [FacetBucket],
    required: false,
  })
  ratings?: FacetBucket[];

  @ApiProperty({
    description: 'Tag facets',
    type: [FacetBucket],
    required: false,
  })
  tags?: FacetBucket[];

  @ApiProperty({
    description: 'Availability facets',
    type: [FacetBucket],
    required: false,
  })
  availability?: FacetBucket[];

  @ApiProperty({
    description: 'Custom facets',
    required: false,
  })
  custom?: Record<string, FacetBucket[]>;
}

export class SearchHits {
  @ApiProperty({ description: 'Total number of matching products' })
  total: {
    value: number;
    relation: string;
  };

  @ApiProperty({
    description: 'Search results',
    type: [ProductSearchResult],
  })
  products: ProductSearchResult[];

  @ApiProperty({ description: 'Maximum search score' })
  max_score?: number;
}

export class SearchPagination {
  @ApiProperty({ description: 'Current page number' })
  current_page: number;

  @ApiProperty({ description: 'Total number of pages' })
  total_pages: number;

  @ApiProperty({ description: 'Results per page' })
  per_page: number;

  @ApiProperty({ description: 'Total number of results' })
  total_results: number;

  @ApiProperty({ description: 'Has next page' })
  has_next: boolean;

  @ApiProperty({ description: 'Has previous page' })
  has_prev: boolean;

  @ApiProperty({ description: 'Next page number', required: false })
  next_page?: number;

  @ApiProperty({ description: 'Previous page number', required: false })
  prev_page?: number;
}

export class SearchSuggestions {
  @ApiProperty({ description: 'Query suggestions' })
  text: string[];

  @ApiProperty({ description: 'Spelling corrections', required: false })
  corrections?: Array<{
    original: string;
    suggested: string;
  }>;
}

export class SearchResponseDto {
  @ApiProperty({ description: 'Search hits and results' })
  hits: SearchHits;

  @ApiProperty({
    description: 'Search facets for filtering',
    required: false,
  })
  facets?: SearchFacets;

  @ApiProperty({
    description: 'Search suggestions',
    required: false,
  })
  suggestions?: SearchSuggestions;

  @ApiProperty({ description: 'Query execution time in milliseconds' })
  took: number;

  @ApiProperty({ description: 'Pagination information' })
  pagination: SearchPagination;

  @ApiProperty({ description: 'Whether results were retrieved from cache' })
  from_cache: boolean;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Search query information' })
  query_info: {
    query?: string;
    filters_applied: string[];
    sort_by?: string;
  };
}
