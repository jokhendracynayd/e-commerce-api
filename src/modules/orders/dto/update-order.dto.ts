import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { CreateAddressDto as AddressDto } from '../../users/dto/address.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'credit_card',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Payment status',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Order status',
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Shipping address',
    type: AddressDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;

  @ApiPropertyOptional({
    description: 'Billing address',
    type: AddressDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiPropertyOptional({
    description: 'Tracking number for the shipment',
    example: '1Z999AA10123456784',
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'URL to track the shipment',
    example: 'https://www.ups.com/track?tracknum=1Z999AA10123456784',
  })
  @IsOptional()
  @IsUrl()
  trackingUrl?: string;

  @ApiPropertyOptional({
    description: 'Estimated delivery date',
    example: '2023-12-25',
  })
  @IsOptional()
  @IsString()
  estimatedDelivery?: string;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217 format)',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}
