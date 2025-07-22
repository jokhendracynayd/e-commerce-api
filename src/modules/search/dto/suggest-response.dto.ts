import { ApiProperty } from '@nestjs/swagger';

export class ProductSuggestion {
  @ApiProperty({ description: 'Product suggestion text' })
  text: string;

  @ApiProperty({ description: 'Product ID' })
  product_id: string;

  @ApiProperty({ description: 'Suggestion relevance score' })
  score: number;

  @ApiProperty({ description: 'Product title' })
  title: string;

  @ApiProperty({ description: 'Product price', required: false })
  price?: number;

  @ApiProperty({ description: 'Product image URL', required: false })
  image?: string;

  @ApiProperty({ description: 'Product availability' })
  in_stock: boolean;

  @ApiProperty({ description: 'Product category', required: false })
  category?: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Product brand', required: false })
  brand?: {
    id: string;
    name: string;
  };
}

export class CategorySuggestion {
  @ApiProperty({ description: 'Category suggestion text' })
  text: string;

  @ApiProperty({ description: 'Category ID' })
  category_id: string;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiProperty({ description: 'Category path' })
  path: string;

  @ApiProperty({ description: 'Number of products in category' })
  product_count: number;

  @ApiProperty({ description: 'Category level in hierarchy' })
  level: number;

  @ApiProperty({ description: 'Parent category', required: false })
  parent?: {
    id: string;
    name: string;
  };
}

export class BrandSuggestion {
  @ApiProperty({ description: 'Brand suggestion text' })
  text: string;

  @ApiProperty({ description: 'Brand ID' })
  brand_id: string;

  @ApiProperty({ description: 'Brand name' })
  name: string;

  @ApiProperty({ description: 'Number of products for brand' })
  product_count: number;

  @ApiProperty({ description: 'Brand logo URL', required: false })
  logo?: string;

  @ApiProperty({ description: 'Brand is featured' })
  is_featured: boolean;
}

export class QuerySuggestion {
  @ApiProperty({ description: 'Query suggestion text' })
  text: string;

  @ApiProperty({ description: 'Search frequency/popularity' })
  frequency: number;

  @ApiProperty({ description: 'Number of results for this query' })
  result_count: number;

  @ApiProperty({ description: 'Last searched timestamp' })
  last_searched: string;
}

export class SpellCorrection {
  @ApiProperty({ description: 'Original misspelled word' })
  original: string;

  @ApiProperty({ description: 'Suggested correction' })
  suggested: string;

  @ApiProperty({ description: 'Confidence score for correction' })
  confidence: number;

  @ApiProperty({ description: 'Number of results for suggested term' })
  result_count: number;
}

export class AutocompleteSuggestion {
  @ApiProperty({ description: 'Autocomplete suggestion text' })
  text: string;

  @ApiProperty({ description: 'Suggestion score/weight' })
  score: number;

  @ApiProperty({ description: 'Type of suggestion' })
  type: 'product' | 'category' | 'brand' | 'query';

  @ApiProperty({ description: 'Additional suggestion data', required: false })
  data?: {
    id?: string;
    image?: string;
    price?: number;
    category?: string;
    brand?: string;
  };
}

export class SuggestResponseDto {
  @ApiProperty({
    description: 'Product suggestions',
    type: [ProductSuggestion],
    required: false,
  })
  products?: ProductSuggestion[];

  @ApiProperty({
    description: 'Category suggestions',
    type: [CategorySuggestion],
    required: false,
  })
  categories?: CategorySuggestion[];

  @ApiProperty({
    description: 'Brand suggestions',
    type: [BrandSuggestion],
    required: false,
  })
  brands?: BrandSuggestion[];

  @ApiProperty({
    description: 'Popular query suggestions',
    type: [QuerySuggestion],
    required: false,
  })
  queries?: QuerySuggestion[];

  @ApiProperty({
    description: 'Spell corrections',
    type: [SpellCorrection],
    required: false,
  })
  corrections?: SpellCorrection[];

  @ApiProperty({ description: 'Query execution time in milliseconds' })
  took: number;

  @ApiProperty({ description: 'Original query text' })
  query: string;

  @ApiProperty({ description: 'Total number of suggestions returned' })
  total_suggestions: number;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Whether results were retrieved from cache' })
  from_cache: boolean;
}

export class AutocompleteResponseDto {
  @ApiProperty({
    description: 'Autocomplete suggestions',
    type: [AutocompleteSuggestion],
  })
  suggestions: AutocompleteSuggestion[];

  @ApiProperty({ description: 'Query execution time in milliseconds' })
  took: number;

  @ApiProperty({ description: 'Original query text' })
  query: string;

  @ApiProperty({ description: 'Total number of suggestions returned' })
  total: number;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Whether results were retrieved from cache' })
  from_cache: boolean;
}
