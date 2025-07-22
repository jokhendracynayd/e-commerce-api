import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderUserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    nullable: true,
  })
  firstName: string | null;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    nullable: true,
  })
  lastName: string | null;

  @ApiPropertyOptional({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;
}

export class OrderProductResponseDto {
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

  @ApiPropertyOptional({
    description: 'Product image URL',
    example: 'https://example.com/images/product-1.jpg',
    nullable: true,
  })
  imageUrl: string | null;
}

export class OrderVariantResponseDto {
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
    description: 'Variant SKU',
    example: 'IPHONE13-BLK-256',
  })
  sku: string;
}

export class OrderItemResponseDto {
  @ApiProperty({
    description: 'Order item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product information',
    type: OrderProductResponseDto,
    nullable: true,
  })
  product: OrderProductResponseDto | null;

  @ApiPropertyOptional({
    description: 'Variant information',
    type: OrderVariantResponseDto,
    nullable: true,
  })
  variant: OrderVariantResponseDto | null;

  @ApiProperty({
    description: 'Quantity of items',
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
    description: 'Creation date',
    example: '2023-07-21T12:00:00Z',
  })
  createdAt: Date;
}

export class OrderResponseDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Order number',
    example: 'ORD-20230721-12345',
  })
  orderNumber: string;

  @ApiPropertyOptional({
    description: 'User information',
    type: OrderUserResponseDto,
    nullable: true,
  })
  user: OrderUserResponseDto | null;

  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'credit_card',
    nullable: true,
  })
  paymentMethod: string | null;

  @ApiProperty({
    description: 'Shipping address',
    type: Object,
    example: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
    },
  })
  shippingAddress: Record<string, any>;

  @ApiProperty({
    description: 'Billing address',
    type: Object,
    example: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
    },
  })
  billingAddress: Record<string, any>;

  @ApiProperty({
    description: 'Order subtotal',
    example: 1999.98,
  })
  subtotal: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 150.0,
  })
  tax: number;

  @ApiProperty({
    description: 'Shipping fee',
    example: 10.0,
  })
  shippingFee: number;

  @ApiProperty({
    description: 'Discount amount',
    example: 200.0,
  })
  discount: number;

  @ApiProperty({
    description: 'Order total',
    example: 1959.98,
  })
  total: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217 format)',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Order items',
    type: [OrderItemResponseDto],
  })
  items: OrderItemResponseDto[];

  @ApiProperty({
    description: 'Order placed date',
    example: '2023-07-21T12:00:00Z',
  })
  placedAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-07-21T12:00:00Z',
  })
  updatedAt: Date;
}
