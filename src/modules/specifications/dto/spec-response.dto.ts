import { ApiProperty } from '@nestjs/swagger';
import { SpecificationDataType } from './create-specification-template.dto';

export class SpecificationTemplateResponseDto {
  @ApiProperty({
    description: 'Specification template ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Specification key',
    example: 'RAM',
  })
  specKey: string;

  @ApiProperty({
    description: 'Display name shown in the UI',
    example: 'RAM Memory',
  })
  displayName: string;

  @ApiProperty({
    description: 'Group this specification belongs to',
    example: 'Technical Specifications',
  })
  specGroup: string;

  @ApiProperty({
    description: 'Sort order within the group',
    example: 10,
  })
  sortOrder: number;

  @ApiProperty({
    description: 'Whether this specification is required',
    example: true,
  })
  isRequired: boolean;

  @ApiProperty({
    description: 'Whether this specification is filterable',
    example: true,
  })
  isFilterable: boolean;

  @ApiProperty({
    description: 'Data type of this specification',
    enum: SpecificationDataType,
    example: SpecificationDataType.STRING,
  })
  dataType: SpecificationDataType;

  @ApiProperty({
    description: 'Predefined options for enum type',
    example: {
      options: ['2GB', '4GB', '8GB', '16GB'],
    },
    nullable: true,
  })
  options: Record<string, any> | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-01-02T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class ProductSpecificationResponseDto {
  @ApiProperty({
    description: 'Specification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiProperty({
    description: 'Specification key',
    example: 'RAM',
  })
  specKey: string;

  @ApiProperty({
    description: 'Specification value',
    example: '8 GB',
  })
  specValue: string;

  @ApiProperty({
    description: 'Specification group',
    example: 'Technical Specifications',
  })
  specGroup: string;

  @ApiProperty({
    description: 'Sort order within the group',
    example: 10,
  })
  sortOrder: number;

  @ApiProperty({
    description: 'Whether this specification is filterable',
    example: true,
  })
  isFilterable: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-01-02T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class GroupedProductSpecificationsResponseDto {
  @ApiProperty({
    description: 'Specification group name',
    example: 'Technical Specifications',
  })
  groupName: string;

  @ApiProperty({
    description: 'Specifications in this group',
    type: [ProductSpecificationResponseDto],
  })
  specifications: ProductSpecificationResponseDto[];
}
