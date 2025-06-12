import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddToWishlistDto {
  @ApiProperty({
    description: 'The ID of the product to add to the wishlist',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString({ message: 'Product ID must be a string' })
  productId: string;
} 