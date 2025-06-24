import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum FacetType {
  TERMS = 'terms',
  RANGE = 'range',
  HISTOGRAM = 'histogram',
  DATE_HISTOGRAM = 'date_histogram',
  NESTED = 'nested',
  FILTERS = 'filters',
}

export enum PriceRangeType {
  FIXED = 'fixed',
  DYNAMIC = 'dynamic',
  PERCENTILE = 'percentile',
}

export class FacetConfig {
  @ApiProperty({
    description: 'Facet field name',
    example: 'category.id',
  })
  field: string;

  @ApiProperty({
    description: 'Facet type',
    enum: FacetType,
    example: FacetType.TERMS,
  })
  type: FacetType;

  @ApiProperty({
    description: 'Maximum number of facet buckets',
    example: 10,
    required: false,
  })
  size?: number;

  @ApiProperty({
    description: 'Minimum document count for facet bucket',
    example: 1,
    required: false,
  })
  min_doc_count?: number;

  @ApiProperty({
    description: 'Sort order for facet buckets',
    example: '_count',
    required: false,
  })
  order?: string;

  @ApiProperty({
    description: 'Include pattern for facet values',
    example: '.*smartphone.*',
    required: false,
  })
  include?: string;

  @ApiProperty({
    description: 'Exclude pattern for facet values',
    example: 'test.*',
    required: false,
  })
  exclude?: string;
}

export class PriceRangeConfig {
  @ApiProperty({
    description: 'Price range type',
    enum: PriceRangeType,
    example: PriceRangeType.FIXED,
  })
  type: PriceRangeType;

  @ApiProperty({
    description: 'Fixed price ranges',
    example: [
      { from: 0, to: 50 },
      { from: 50, to: 100 },
      { from: 100, to: 500 },
      { from: 500 },
    ],
    required: false,
  })
  ranges?: Array<{
    from?: number;
    to?: number;
    key?: string;
  }>;

  @ApiProperty({
    description: 'Interval for histogram ranges',
    example: 50,
    required: false,
  })
  interval?: number;

  @ApiProperty({
    description: 'Extended bounds for histogram',
    required: false,
  })
  extended_bounds?: {
    min: number;
    max: number;
  };
}

export class CategoryFacetConfig {
  @ApiProperty({
    description: 'Include subcategories in hierarchy',
    example: true,
    required: false,
  })
  include_hierarchy?: boolean;

  @ApiProperty({
    description: 'Maximum depth for category hierarchy',
    example: 3,
    required: false,
  })
  max_depth?: number;

  @ApiProperty({
    description: 'Show category path in results',
    example: true,
    required: false,
  })
  show_path?: boolean;

  @ApiProperty({
    description: 'Parent category ID to filter by',
    required: false,
  })
  parent_category?: string;
}

export class FacetOptionsDto {
  @ApiProperty({
    description: 'Enable category facets',
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
  categories?: boolean = true;

  @ApiProperty({
    description: 'Category facet configuration',
    required: false,
  })
  @IsOptional()
  category_config?: CategoryFacetConfig;

  @ApiProperty({
    description: 'Enable brand facets',
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
  brands?: boolean = true;

  @ApiProperty({
    description: 'Maximum number of brand facets',
    required: false,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  brand_size?: number = 20;

  @ApiProperty({
    description: 'Enable price range facets',
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
  price_ranges?: boolean = true;

  @ApiProperty({
    description: 'Price range configuration',
    required: false,
  })
  @IsOptional()
  price_config?: PriceRangeConfig;

  @ApiProperty({
    description: 'Enable rating facets',
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
  ratings?: boolean = true;

  @ApiProperty({
    description: 'Enable tag facets',
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
  tags?: boolean = false;

  @ApiProperty({
    description: 'Maximum number of tag facets',
    required: false,
    example: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  tag_size?: number = 15;

  @ApiProperty({
    description: 'Enable availability facets',
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
  availability?: boolean = true;

  @ApiProperty({
    description: 'Custom facet configurations',
    required: false,
    example: {
      color: { field: 'attributes.color', type: 'terms', size: 10 },
      size: { field: 'attributes.size', type: 'terms', size: 15 },
    },
  })
  @IsOptional()
  custom_facets?: Record<string, FacetConfig>;

  @ApiProperty({
    description: 'Minimum document count for all facets',
    required: false,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_doc_count?: number = 1;

  @ApiProperty({
    description: 'Include facets with zero counts',
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
  include_zero_counts?: boolean = false;

  @ApiProperty({
    description: 'Apply current filters to facets',
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
  filtered_facets?: boolean = false;
}

export class HierarchicalFacetBucket {
  @ApiProperty({ description: 'Facet key/value' })
  key: string;

  @ApiProperty({ description: 'Document count for this facet' })
  doc_count: number;

  @ApiProperty({ description: 'Facet display name', required: false })
  name?: string;

  @ApiProperty({ description: 'Facet path in hierarchy', required: false })
  path?: string;

  @ApiProperty({ description: 'Parent facet key', required: false })
  parent?: string;

  @ApiProperty({ description: 'Facet level in hierarchy', required: false })
  level?: number;

  @ApiProperty({ description: 'Child facets', required: false })
  children?: HierarchicalFacetBucket[];

  @ApiProperty({
    description: 'Whether this facet is selected',
    required: false,
  })
  selected?: boolean;

  @ApiProperty({ description: 'Additional facet metadata', required: false })
  metadata?: Record<string, any>;
}

export class ExtendedFacetBucket {
  @ApiProperty({ description: 'Facet key/value' })
  key: string;

  @ApiProperty({ description: 'Document count for this facet' })
  doc_count: number;

  @ApiProperty({ description: 'Facet display name', required: false })
  name?: string;

  @ApiProperty({
    description: 'Whether this facet is selected',
    required: false,
  })
  selected?: boolean;

  @ApiProperty({ description: 'Facet percentage of total', required: false })
  percentage?: number;

  @ApiProperty({ description: 'Additional facet data', required: false })
  data?: any;
}

export class RatingFacetBucket {
  @ApiProperty({ description: 'Rating value (1-5)' })
  key: number;

  @ApiProperty({ description: 'Document count for this rating' })
  doc_count: number;

  @ApiProperty({ description: 'Rating display label', required: false })
  label?: string;

  @ApiProperty({
    description: 'Whether this rating is selected',
    required: false,
  })
  selected?: boolean;
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

  @ApiProperty({ description: 'Range display label', required: false })
  label?: string;

  @ApiProperty({
    description: 'Whether this range is selected',
    required: false,
  })
  selected?: boolean;

  @ApiProperty({ description: 'Percentage of total products', required: false })
  percentage?: number;
}

export class AdvancedSearchFacets {
  @ApiProperty({
    description: 'Category facets with hierarchy',
    type: [HierarchicalFacetBucket],
    required: false,
  })
  categories?: HierarchicalFacetBucket[];

  @ApiProperty({
    description: 'Brand facets',
    type: [ExtendedFacetBucket],
    required: false,
  })
  brands?: ExtendedFacetBucket[];

  @ApiProperty({
    description: 'Price range facets',
    type: [PriceRangeFacet],
    required: false,
  })
  price_ranges?: PriceRangeFacet[];

  @ApiProperty({
    description: 'Rating facets',
    type: [RatingFacetBucket],
    required: false,
  })
  ratings?: RatingFacetBucket[];

  @ApiProperty({
    description: 'Tag facets',
    type: [ExtendedFacetBucket],
    required: false,
  })
  tags?: ExtendedFacetBucket[];

  @ApiProperty({
    description: 'Availability facets',
    type: [ExtendedFacetBucket],
    required: false,
  })
  availability?: ExtendedFacetBucket[];

  @ApiProperty({
    description: 'Custom facets',
    required: false,
  })
  custom?: Record<string, ExtendedFacetBucket[]>;

  @ApiProperty({
    description: 'Total number of products for all facets',
    required: false,
  })
  total_products?: number;

  @ApiProperty({
    description: 'Applied filters summary',
    required: false,
  })
  applied_filters?: {
    categories?: string[];
    brands?: string[];
    price_range?: { min?: number; max?: number };
    rating?: number;
    tags?: string[];
    custom?: Record<string, string[]>;
  };
}
