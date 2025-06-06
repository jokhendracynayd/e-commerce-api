import { IsString, IsArray, IsOptional, IsUUID, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID('4')
  productId: string;

  @ApiProperty({ description: 'Quantity of the product' })
  @IsNumber()
  quantity: number;
}

export class ApplyCouponDto {
  @ApiProperty({ description: 'Coupon code to apply' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'User ID' })
  @IsUUID('4')
  userId: string;

  @ApiProperty({ description: 'Subtotal amount before applying coupon' })
  @IsString()
  subtotal: string;

  @ApiPropertyOptional({ type: [CartItemDto], description: 'Cart items for validation' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  @IsOptional()
  cartItems?: CartItemDto[];
} 