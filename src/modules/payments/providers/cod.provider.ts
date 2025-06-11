import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { CreatePaymentIntentDto } from '../dto';
import { PaymentResult } from '../interfaces/payment.interface';
import { PaymentProviderInterface } from './payment-provider.interface';
import { AppLogger } from '../../../common/services/logger.service';

@Injectable()
export class CodProvider implements PaymentProviderInterface {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext('CodProvider');
  }

  /**
   * Create a payment intent for Cash on Delivery
   * For COD, this simply returns a simple response with minimal needed data,
   * as no external payment provider is involved
   */
  async createPaymentIntent(
    dto: CreatePaymentIntentDto,
  ): Promise<Record<string, any>> {
    try {
      const startTime = Date.now();
      
      // Generate a reference ID for tracking
      const referenceId = `cod_${uuidv4().substring(0, 8)}`;
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`COD payment intent creation took ${processingTime}ms`);

      return {
        id: referenceId,
        amount: dto.amount,
        currency: dto.currency,
        status: PaymentStatus.PENDING,
        message: 'Cash on delivery payment recorded',
      };
    } catch (error) {
      this.logger.error(`Error creating COD payment intent: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify a COD payment
   * For COD, verification is a placeholder since the actual payment happens at delivery
   */
  async verifyPayment(
    payment: any,
    providerPaymentId: string,
  ): Promise<PaymentResult> {
    try {
      const startTime = Date.now();
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`COD payment verification took ${processingTime}ms`);
      
      // For COD, we just mark it as pending (to be collected)
      return {
        success: true,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: PaymentStatus.PENDING,
        message: 'Cash on delivery payment recorded',
      };
    } catch (error) {
      this.logger.error(`COD payment verification failed: ${error.message}`, error.stack);
      return {
        success: false,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        message: `COD payment verification failed: ${error.message}`,
        error: error,
      };
    }
  }

  /**
   * Process a refund for COD payment
   * For COD, this simply marks the payment as refunded
   */
  async processRefund(
    payment: any,
    amount?: number,
    reason?: string,
  ): Promise<PaymentResult> {
    try {
      const startTime = Date.now();
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`COD refund processing took ${processingTime}ms`);
      
      // For COD, just mark as refunded
      return {
        success: true,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: PaymentStatus.REFUNDED,
        message: 'Cash payment marked as refunded',
      };
    } catch (error) {
      this.logger.error(`COD refund failed: ${error.message}`, error.stack);
      return {
        success: false,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        message: `COD refund failed: ${error.message}`,
        error: error,
      };
    }
  }
} 