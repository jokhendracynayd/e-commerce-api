import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class AddStockDto {
  @ApiProperty({
    description: 'ID of the product to add stock for',
    example: '03f7426b-9cff-4f34-a4d5-e1471b21ed4c',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'ID of the product variant to add stock for (optional)',
    example: '4a9d7b1f-0b3e-4d6c-8a1e-3f5c7b8a9d0e',
  })
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiProperty({
    description: 'Quantity to add to stock',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description:
      'Low stock threshold - when stock falls below this value, it will be marked as low stock',
    example: 5,
    default: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  threshold?: number;

  @ApiPropertyOptional({
    description: 'Optional note about this stock addition',
    example: 'Initial inventory setup',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
