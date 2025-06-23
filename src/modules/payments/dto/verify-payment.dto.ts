import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Payment intent ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4)
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({
    description:
      'Provider-specific payment ID (e.g., Stripe payment_intent ID)',
    example: 'pi_3O9mDn2eZvKYlo2C1KrtBUMM',
  })
  @IsString()
  @IsNotEmpty()
  providerPaymentId: string;

  @ApiPropertyOptional({
    description:
      'Signature for payment verification (required for certain providers like Razorpay)',
    example: '5caf5a0e17af4c51d131a37e87c9df616c3c5dc9c0337a2ed3a2aa46739fdb93',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}
