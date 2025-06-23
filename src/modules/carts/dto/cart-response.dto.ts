import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product title',
    example: 'iPhone 13 Pro',
  })
  title: string;

  @ApiProperty({
    description: 'Product slug',
    example: 'iphone-13-pro',
  })
  slug: string;

  @ApiProperty({
    description: 'Product price',
    example: 999.99,
  })
  price: number;

  @ApiPropertyOptional({
    description: 'Product discount price',
    example: 899.99,
    nullable: true,
  })
  discountPrice?: number | null;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  currency: string;

  @ApiPropertyOptional({
    description: 'Product image URL',
    example: 'https://example.com/images/product-1.jpg',
    nullable: true,
  })
  imageUrl: string | null;
}

export class CartVariantResponseDto {
  @ApiProperty({
    description: 'Variant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Variant name',
    example: 'Black, 256GB',
  })
  variantName: string;

  @ApiProperty({
    description: 'Variant price',
    example: 1099.99,
  })
  price: number;

  @ApiProperty({
    description: 'Variant SKU',
    example: 'IPHONE13-BLK-256',
  })
  sku: string;
}

export class CartItemResponseDto {
  @ApiProperty({
    description: 'Cart item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product information',
    type: CartProductResponseDto,
  })
  product: CartProductResponseDto;

  @ApiPropertyOptional({
    description: 'Variant information (if applicable)',
    type: CartVariantResponseDto,
    nullable: true,
  })
  variant: CartVariantResponseDto | null;

  @ApiProperty({
    description: 'Quantity',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit price',
    example: 999.99,
  })
  unitPrice: number;

  @ApiProperty({
    description: 'Total price for this item',
    example: 1999.98,
  })
  totalPrice: number;

  @ApiProperty({
    description: 'Date when item was added to cart',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when item was last updated',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;
}

export class CartResponseDto {
  @ApiProperty({
    description: 'Cart ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Cart items',
    type: [CartItemResponseDto],
  })
  items: CartItemResponseDto[];

  @ApiProperty({
    description: 'Total number of items in cart',
    example: 3,
  })
  itemCount: number;

  @ApiProperty({
    description: 'Subtotal price of all items',
    example: 2999.97,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Date when cart was created',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when cart was last updated',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;
}
