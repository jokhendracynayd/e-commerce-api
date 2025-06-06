import { IsString, IsEnum, IsNumber, IsOptional, IsArray, Min, IsDateString, IsPositive, MaxLength, MinLength, ArrayMinSize, Validate, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export class CreateCouponDto {
  @ApiProperty({ description: 'Unique coupon code' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  code: string;

  @ApiProperty({ enum: CouponType, description: 'Type of coupon discount', enumName: 'CouponType' })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ description: 'Value of the coupon (percentage or fixed amount)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'Description of the coupon' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Minimum purchase amount required to use the coupon' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  minimumPurchase?: number;

  @ApiPropertyOptional({ description: 'Maximum number of times the coupon can be used' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Maximum number of times a user can use this coupon' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  perUserLimit?: number;

  @ApiProperty({ description: 'Coupon validity start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Coupon validity end date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'List of category IDs this coupon applies to', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'List of product IDs this coupon applies to', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  productIds?: string[];
} 