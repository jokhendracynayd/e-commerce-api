import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FilterValueDto {
  @ApiProperty({ description: 'Unique identifier for the filter value' })
  id: string;

  @ApiProperty({ description: 'Display name for the filter value' })
  name: string;

  @ApiProperty({ description: 'Number of products matching this filter value' })
  count: number;
}

export class PriceRangeDto {
  @ApiProperty({ description: 'Minimum price in the current product set' })
  min: number;

  @ApiProperty({ description: 'Maximum price in the current product set' })
  max: number;

  @ApiProperty({ description: 'Step size recommendation for price slider' })
  step: number;
}

export class AttributeFilterDto {
  @ApiProperty({ description: 'Display name for the attribute' })
  name: string;

  @ApiProperty({ description: 'Unique key for the attribute (use in filter query)' })
  key: string;

  @ApiProperty({ description: 'Type of filter (checkbox, radio, etc.)' })
  type: 'checkbox' | 'radio' | 'range';

  @ApiProperty({ description: 'Priority order for display (lower appears first)' })
  priority: number;

  @ApiProperty({ description: 'Available values for this attribute', type: [FilterValueDto] })
  values: FilterValueDto[];
}

export class FilterOptionsResponseDto {
  @ApiProperty({ description: 'Available price range', type: PriceRangeDto })
  priceRange: PriceRangeDto;

  @ApiProperty({ description: 'Available brands', type: [FilterValueDto] })
  brands: FilterValueDto[];

  @ApiProperty({ description: 'Available product tags', type: [FilterValueDto] })
  tags: FilterValueDto[];

  @ApiProperty({ description: 'Rating filter options', type: [FilterValueDto] })
  ratings: FilterValueDto[];

  @ApiProperty({ description: 'Dynamic product attributes', type: [AttributeFilterDto] })
  attributes: AttributeFilterDto[];
}

export class FilterOptionsQueryDto {
  @ApiProperty({ description: 'Category ID to get filters for', required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  
  @ApiProperty({ description: 'Category slug to get filters for', required: false })
  @IsOptional()
  @IsString()
  categorySlug?: string;
  
  @ApiProperty({ description: 'Brand ID to get filters for', required: false })
  @IsOptional()
  @IsUUID()
  brandId?: string;
  
  @ApiProperty({ description: 'Search term to get filters for', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Minimum price to consider for filter generation', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;
  
  @ApiProperty({ description: 'Maximum price to consider for filter generation', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;
  
  @ApiProperty({ description: 'Whether to include products from all subcategories', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  recursive?: boolean = true;
} 