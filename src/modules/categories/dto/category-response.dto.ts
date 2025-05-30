import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  name: string;

  @ApiProperty({
    description: 'Category slug used for SEO-friendly URLs',
    example: 'electronics',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'All electronic devices and accessories',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Category icon (URL or icon name)',
    example: 'electronic-icon.svg',
  })
  icon?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  parentId?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-01-01T12:00:00Z',
  })
  updatedAt: Date;
}

export class CategoryDetailResponseDto extends CategoryResponseDto {
  @ApiPropertyOptional({
    description: 'Parent category information',
    type: CategoryResponseDto,
    nullable: true,
  })
  parent?: CategoryResponseDto;

  @ApiPropertyOptional({
    description: 'Child categories list',
    type: [CategoryResponseDto],
    nullable: true,
  })
  children?: CategoryResponseDto[];
}

export class CategoryTreeResponseDto extends CategoryResponseDto {
  @ApiPropertyOptional({
    description: 'Child categories with their own children',
    type: [CategoryTreeResponseDto],
    nullable: true,
  })
  children?: CategoryTreeResponseDto[];
}
