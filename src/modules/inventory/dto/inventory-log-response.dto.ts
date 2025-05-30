import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryChangeType } from '@prisma/client';

export class InventoryLogResponseDto {
  @ApiProperty({
    description: 'Inventory log ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

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
    description: 'Type of inventory change',
    enum: InventoryChangeType,
    example: InventoryChangeType.RESTOCK,
  })
  changeType: InventoryChangeType;

  @ApiProperty({
    description:
      'Quantity changed (positive for additions, negative for reductions)',
    example: 50,
  })
  quantityChanged: number;

  @ApiPropertyOptional({
    description: 'Optional note about the inventory change',
    example: 'Restock from supplier ABC',
    nullable: true,
  })
  note: string | null;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;
}
