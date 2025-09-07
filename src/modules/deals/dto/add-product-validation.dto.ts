import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsInt, IsPositive } from 'class-validator';

export class AddProductValidationDto {
  @ApiProperty({
    description: 'Product ID to add to the deal',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4)
  productId: string;

  @ApiProperty({
    description: 'Maximum usage limit for this product in the deal',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUsage?: number;
}
