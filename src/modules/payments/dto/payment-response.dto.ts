import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { PaymentMethod, PaymentProvider } from '../interfaces/payment.interface';

export class PaymentIntentResponseDto {
  @ApiProperty({
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 99.99,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'PENDING',
    enum: PaymentStatus,
  })
  status: PaymentStatus;

  @ApiProperty({
    description: 'Payment provider',
    example: 'STRIPE',
  })
  provider: string;

  @ApiPropertyOptional({
    description: 'Provider-specific payment ID',
    example: 'pi_3O9mDn2eZvKYlo2C1KrtBUMM',
  })
  providerPaymentId?: string;

  @ApiProperty({
    description: 'Payment method',
    example: 'CREDIT_CARD',
  })
  paymentMethod: string;

  @ApiPropertyOptional({
    description: 'Client-side data needed for payment processing',
    example: {
      clientSecret: 'pi_3O9mDn2eZvKYlo2C1KrtBUMM_secret_xyz',
      publishableKey: 'pk_test_xyz'
    }
  })
  clientData?: Record<string, any>;

  @ApiProperty({
    description: 'Created date',
    example: '2023-04-15T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last updated date',
    example: '2023-04-15T12:05:00.000Z',
  })
  updatedAt: Date;
}

export class PaymentResultResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'PAID',
    enum: PaymentStatus,
  })
  status: PaymentStatus;

  @ApiProperty({
    description: 'Result message',
    example: 'Payment verified successfully',
  })
  message: string;
} 