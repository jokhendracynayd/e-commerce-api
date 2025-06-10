import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator';

export class AnonymousCartItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4)
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Product variant ID (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  variantId?: string;

  @ApiProperty({
    description: 'Quantity of items',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({
    description: 'Any additional information (color, size, etc.)',
    example: { color: 'red' },
    nullable: true,
    required: false,
  })
  @IsOptional()
  additionalInfo?: any;
}

export class MergeAnonymousCartDto {
  @ApiProperty({
    description: 'Array of cart items to merge',
    type: [AnonymousCartItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AnonymousCartItemDto)
  items: AnonymousCartItemDto[];
} 