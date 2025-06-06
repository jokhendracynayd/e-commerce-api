import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  DISABLED = 'DISABLED',
}

export class CategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class ProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;
}

export class CouponResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ enum: CouponType, enumName: 'CouponType' })
  type: CouponType;

  @ApiProperty()
  value: string | number;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  minimumPurchase?: string | number;

  @ApiPropertyOptional()
  usageLimit?: number;

  @ApiProperty()
  usageCount: number;

  @ApiPropertyOptional()
  perUserLimit?: number;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty({ enum: CouponStatus, enumName: 'CouponStatus' })
  status: CouponStatus;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: [CategoryDto] })
  categories?: CategoryDto[];

  @ApiPropertyOptional({ type: [ProductDto] })
  products?: ProductDto[];
} 