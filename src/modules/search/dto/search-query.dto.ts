import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SortOption {
  RELEVANCE = 'relevance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING = 'rating',
  NEWEST = 'newest',
  POPULARITY = 'popularity',
}

export enum QueryType {
  MULTI_MATCH = 'multi_match',
  PHRASE = 'phrase',
  PREFIX = 'prefix',
  FUZZY = 'fuzzy',
  WILDCARD = 'wildcard',
  BOOLEAN = 'boolean',
}

export enum SearchMode {
  STANDARD = 'standard',
  STRICT = 'strict',
  RELAXED = 'relaxed',
}

export class SearchProductsQueryDto {
  @ApiProperty({
    description: 'Search query text',
    required: false,
    example: 'smartphone',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    description: 'Query type for advanced search modes',
    required: false,
    enum: QueryType,
    example: QueryType.MULTI_MATCH,
  })
  @IsOptional()
  @IsEnum(QueryType)
  query_type?: QueryType;

  @ApiProperty({
    description: 'Search mode for controlling search strictness',
    required: false,
    enum: SearchMode,
    example: SearchMode.STANDARD,
  })
  @IsOptional()
  @IsEnum(SearchMode)
  search_mode?: SearchMode;

  @ApiProperty({
    description: 'Enable fuzzy matching for typo tolerance',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  fuzzy?: boolean;

  @ApiProperty({
    description: 'Fuzziness level (0-2 or AUTO)',
    required: false,
    example: 'AUTO',
  })
  @IsOptional()
  @IsString()
  fuzziness?: string;

  @ApiProperty({
    description: 'Enable phrase matching for exact phrases',
    required: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  phrase_match?: boolean;

  @ApiProperty({
    description: 'Proximity distance for phrase matching',
    required: false,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  proximity?: number;

  @ApiProperty({
    description: 'Minimum should match percentage (10-100)',
    required: false,
    example: 75,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(100)
  minimum_should_match?: number;

  @ApiProperty({
    description: 'Custom boost values for specific fields',
    required: false,
    example: { title: 5, brand: 3 },
  })
  @IsOptional()
  field_boosts?: Record<string, number>;

  @ApiProperty({
    description: 'Boolean query operators (+, -, AND, OR)',
    required: false,
    example: '+smartphone -android',
  })
  @IsOptional()
  @IsString()
  boolean_query?: string;

  @ApiProperty({
    description: 'Category IDs to filter by',
    required: false,
    type: [String],
    example: ['cat1', 'cat2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  category?: string[];

  @ApiProperty({
    description: 'Brand IDs to filter by',
    required: false,
    type: [String],
    example: ['brand1', 'brand2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  brand?: string[];

  @ApiProperty({
    description: 'Minimum price filter',
    required: false,
    example: 10.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_min?: number;

  @ApiProperty({
    description: 'Maximum price filter',
    required: false,
    example: 1000.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_max?: number;

  @ApiProperty({
    description: 'Minimum rating filter (1-5)',
    required: false,
    example: 4.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating_min?: number;

  @ApiProperty({
    description: 'Filter by stock availability',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  in_stock?: boolean;

  @ApiProperty({
    description: 'Sort option',
    required: false,
    enum: SortOption,
    example: SortOption.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption;

  @ApiProperty({
    description: 'Page number (1-based)',
    required: false,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Results per page (max 100)',
    required: false,
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Include facets in response',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  facets?: boolean = false;

  @ApiProperty({
    description: 'User ID for personalization',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({
    description: 'Session ID for analytics',
    required: false,
  })
  @IsOptional()
  @IsString()
  session_id?: string;

  @ApiProperty({
    description: 'Enable function score for custom relevance',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  function_score?: boolean;

  @ApiProperty({
    description: 'Custom scoring factors',
    required: false,
    example: { popularity: 1.2, rating: 1.1, featured: 1.5 },
  })
  @IsOptional()
  score_factors?: Record<string, number>;

  @ApiProperty({
    description: 'Facet configuration options',
    required: false,
  })
  @IsOptional()
  facet_options?: any; // Will be typed properly when importing FacetOptionsDto
}
