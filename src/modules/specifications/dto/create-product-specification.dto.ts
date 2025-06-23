import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateProductSpecificationDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Specification key',
    example: 'RAM',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  specKey: string;

  @ApiProperty({
    description: 'Specification value',
    example: '8 GB',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  specValue: string;

  @ApiProperty({
    description: 'Specification group',
    example: 'Technical Specifications',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  specGroup: string;

  @ApiPropertyOptional({
    description: 'Sort order within the group',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this specification is filterable',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;
}

export class CreateProductSpecificationBulkDto {
  @ApiProperty({
    type: [CreateProductSpecificationDto],
    description: 'Array of specifications to create',
  })
  specifications: CreateProductSpecificationDto[];
}
