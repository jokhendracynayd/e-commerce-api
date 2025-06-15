import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryResponseDto {
  @ApiProperty({
    description: 'Inventory ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product title',
    example: 'Product 1',
  })
  title: string;

  @ApiProperty({
    description: 'Product SKU',
    example: '1234567890',
  })
  sku: string;

  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId: string;

  @ApiPropertyOptional({
    description: 'Variant ID (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  variantId: string | null;

  @ApiProperty({
    description: 'Current stock quantity',
    example: 100,
  })
  stockQuantity: number;

  @ApiProperty({
    description: 'Reserved quantity (committed to orders but not yet shipped)',
    example: 5,
  })
  reservedQuantity: number;

  @ApiProperty({
    description: 'Available quantity (stockQuantity - reservedQuantity)',
    example: 95,
  })
  availableQuantity: number;

  @ApiProperty({
    description: 'Low stock threshold for notifications',
    example: 10,
  })
  threshold: number;

  @ApiPropertyOptional({
    description: 'Last restock date',
    example: '2023-07-21T12:00:00Z',
    nullable: true,
  })
  lastRestockedAt: Date | null;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Flag indicating if the inventory is low',
    example: false,
  })
  isLowStock: boolean;
}
