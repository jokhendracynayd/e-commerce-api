import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class ApplyDealDto {
  @ApiProperty({
    description: 'User ID applying the deal',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4)
  userId: string;

  @ApiProperty({
    description: 'Product ID to apply the deal to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4)
  productId: string;

  @ApiProperty({
    description: 'Order ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID(4)
  orderId?: string;
}
