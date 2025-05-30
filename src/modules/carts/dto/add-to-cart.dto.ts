import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class AddToCartDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4)
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Product variant ID (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4)
  variantId?: string;

  @ApiProperty({
    description: 'Quantity of items to add',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number = 1;
}
