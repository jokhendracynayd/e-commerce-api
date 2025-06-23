import { ApiProperty } from '@nestjs/swagger';

class WishlistProductDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Bluetooth Headphones' })
  title: string;

  @ApiProperty({ example: 'bluetooth-headphones' })
  slug: string;

  @ApiProperty({ example: 99.99 })
  price: number;

  @ApiProperty({ example: 79.99, required: false, nullable: true })
  discountPrice?: number | null;

  @ApiProperty({
    example: 'https://example.com/images/headphones.jpg',
    required: false,
    nullable: true,
  })
  imageUrl: string | null;
}

export class WishlistItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  productId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  addedAt: Date;

  @ApiProperty({ type: WishlistProductDto })
  product: WishlistProductDto;
}
