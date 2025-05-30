import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { InventoryChangeType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateInventoryLogDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4)
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Variant ID (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4)
  variantId?: string;

  @ApiProperty({
    description: 'Type of inventory change',
    enum: InventoryChangeType,
    example: InventoryChangeType.RESTOCK,
  })
  @IsEnum(InventoryChangeType)
  changeType: InventoryChangeType;

  @ApiProperty({
    description:
      'Quantity changed (positive for additions, negative for reductions)',
    example: 50,
  })
  @IsInt()
  @Type(() => Number)
  quantityChanged: number;

  @ApiPropertyOptional({
    description: 'Optional note about the inventory change',
    example: 'Restock from supplier ABC',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
