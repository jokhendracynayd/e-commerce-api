import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({
    description: 'Payment intent ID to refund',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4)
  @IsNotEmpty()
  paymentId: string;

  @ApiPropertyOptional({
    description:
      'Amount to refund (if not provided, full amount will be refunded)',
    example: 50.0,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Reason for the refund',
    example: 'Customer dissatisfied with product',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
