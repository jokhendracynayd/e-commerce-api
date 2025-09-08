import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus } from '@prisma/client';
import { CreatePaymentIntentDto } from '../dto';
import { PaymentResult } from '../interfaces/payment.interface';
import { PaymentProviderInterface } from './payment-provider.interface';
import { AppLogger } from '../../../common/services/logger.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
@Injectable()
export class RazorpayProvider implements PaymentProviderInterface {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('RazorpayProvider');
  }

  /**
   * Create a payment intent with Razorpay
   */
  async createPaymentIntent(
    dto: CreatePaymentIntentDto,
  ): Promise<Record<string, any>> {
    try {
      this.logger.log('📝 Creating new Razorpay order...');

      // Input validation
      if (!dto.amount || isNaN(dto.amount) || dto.amount <= 0) {
        throw new BadRequestException(
          'Invalid amount. Amount must be a positive number',
        );
      }

      // if (dto.amount > 100000) {
      //   throw new BadRequestException(
      //     'Amount too high. Maximum amount allowed is ₹1,00,000',
      //   );
      // }

      // Configuration validation
      const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
      const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

      if (!keyId || !keySecret) {
        throw new InternalServerErrorException(
          'Razorpay configuration missing. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET',
        );
      }

      this.logger.log(`💰 Creating order for ₹${dto.amount}`);

      // Record metrics
      const startTime = Date.now();

      // Initialize Razorpay client
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      // Create order with retry logic
      let order;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Generate unique receipt ID
          const receiptId = `rcpt_${dto.orderId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          order = await razorpay.orders.create({
            amount: Math.round(dto.amount * 100), // Convert to paise and round
            currency: dto.currency || 'INR',
            receipt: receiptId,
            payment_capture: true, // Auto-capture payment
            notes: {
              orderId: dto.orderId,
              source: 'ecommerce_api',
              timestamp: new Date().toISOString(),
              ...(dto.customerEmail && { customerEmail: dto.customerEmail }),
              ...(dto.metadata || {}),
            },
          });

          this.logger.log(`✅ Order created successfully: ${order.id}`);
          break;
        } catch (razorpayError: any) {
          retryCount++;
          this.logger.error(
            `❌ Razorpay error (attempt ${retryCount}): ${razorpayError.message}`,
            razorpayError.stack,
          );

          if (retryCount >= maxRetries) {
            throw new InternalServerErrorException(
              `Razorpay API failed after ${maxRetries} attempts: ${razorpayError.message}`,
            );
          }

          // Wait before retry (exponential backoff)
          const waitTime = 1000 * Math.pow(2, retryCount - 1);
          this.logger.log(`⏳ Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

      // Validate order response
      if (!order || !order.id) {
        throw new InternalServerErrorException(
          'Invalid order response from Razorpay',
        );
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Razorpay order creation took ${processingTime}ms`);

      // Prepare response
      const response = {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        createdAt: order.created_at,
        keyId: keyId,
        callbackUrl: this.configService.get<string>('RAZORPAY_CALLBACK_URL'),
        // Additional metadata for client
        orderId: dto.orderId,
        customerEmail: dto.customerEmail,
        metadata: dto.metadata,
      };

      this.logger.log(`📤 Order response prepared:`, {
        orderId: order.id,
        amount: order.amount,
        status: order.status,
        processingTime: `${processingTime}ms`,
      });

      return response;
    } catch (error) {
      this.logger.error(
        `💥 Error creating Razorpay order: ${error.message}`,
        error.stack,
      );

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Handle unknown errors
      throw new InternalServerErrorException(
        `Failed to create Razorpay order: ${error.message}`,
      );
    }
  }

  /**
   * Verify a Razorpay payment
   */
  async verifyPayment(
    payment: any,
    providerPaymentId: string,
    signature?: string,
  ): Promise<PaymentResult> {
    try {
      this.logger.log(`🔍 Verifying Razorpay payment: ${providerPaymentId}`);

      const startTime = Date.now();

      // Configuration validation
      const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
      const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

      if (!keyId || !keySecret) {
        throw new InternalServerErrorException(
          'Razorpay configuration missing for verification',
        );
      }

      if (!signature) {
        throw new BadRequestException(
          'Razorpay signature is required for verification',
        );
      }

      // Initialize Razorpay client
      const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      // Fetch payment details from Razorpay
      let razorpayPayment;
      try {
        razorpayPayment = await razorpay.payments.fetch(providerPaymentId);
        this.logger.log(`📋 Payment details fetched: ${razorpayPayment.status}`);
      } catch (razorpayError: any) {
        this.logger.error(
          `❌ Failed to fetch payment from Razorpay: ${razorpayError.message}`,
        );
        throw new InternalServerErrorException(
          `Failed to fetch payment details: ${razorpayError.message}`,
        );
      }

      // Verify signature using Razorpay's webhook signature verification
      // The signature should be generated from: razorpay_order_id + "|" + razorpay_payment_id
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayPayment.order_id}|${razorpayPayment.id}`)
        .digest('hex');

      const isValidSignature = expectedSignature === signature;
      
      if (!isValidSignature) {
        this.logger.error('❌ Invalid signature verification');
        throw new BadRequestException('Invalid payment signature');
      }

      // Check payment status
      let paymentStatus: PaymentStatus;
      let success = false;
      let message = '';

      switch (razorpayPayment.status) {
        case 'captured':
          paymentStatus = PaymentStatus.PAID;
          success = true;
          message = 'Payment verified and captured successfully';
          break;
        case 'authorized':
          paymentStatus = PaymentStatus.PENDING;
          success = true;
          message = 'Payment authorized but not captured';
          break;
        case 'failed':
          paymentStatus = PaymentStatus.FAILED;
          success = false;
          message = 'Payment failed';
          break;
        case 'refunded':
          paymentStatus = PaymentStatus.REFUNDED;
          success = true;
          message = 'Payment has been refunded';
          break;
        default:
          paymentStatus = PaymentStatus.PENDING;
          success = false;
          message = `Unknown payment status: ${razorpayPayment.status}`;
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Payment verification completed in ${processingTime}ms`);

      return {
        success,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: paymentStatus,
        message,
        transactionId: razorpayPayment.id,
        // Additional Razorpay specific data
        providerResponse: {
          razorpayPaymentId: razorpayPayment.id,
          razorpayOrderId: razorpayPayment.order_id,
          amount: razorpayPayment.amount,
          currency: razorpayPayment.currency,
          method: razorpayPayment.method,
          status: razorpayPayment.status,
          capturedAt: razorpayPayment.captured_at,
          createdAt: razorpayPayment.created_at,
        },
      };
    } catch (error) {
      this.logger.error(
        `💥 Razorpay payment verification failed: ${error.message}`,
        error.stack,
      );

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Return failure result for unknown errors
      return {
        success: false,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status || PaymentStatus.FAILED,
        message: `Payment verification failed: ${error.message}`,
        error: error,
      };
    }
  }

  /**
   * Process a refund with Razorpay
   */
  async processRefund(
    payment: any,
    amount?: number,
    reason?: string,
  ): Promise<PaymentResult> {
    try {
      // This is a placeholder for actual Razorpay refund processing
      // In production, you would use the Razorpay SDK to process the refund

      const startTime = Date.now();

      // Here, in a real implementation, we would call Razorpay API
      // const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
      // const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
      // const razorpay = new Razorpay({
      //    key_id: keyId,
      //    key_secret: keySecret
      // });
      //
      // // Determine if this is a full or partial refund
      // const isPartialRefund = amount && amount < parseFloat(payment.amount);
      // const refundAmount = amount ? Math.round(amount * 100) : undefined; // in paise
      //
      // const refund = await razorpay.payments.refund(payment.providerPaymentId, {
      //    amount: refundAmount, // If undefined, refund the full amount
      //    notes: {
      //      reason: reason || 'requested_by_customer',
      //      orderId: payment.orderId,
      //      isPartialRefund: isPartialRefund ? 'true' : 'false'
      //    }
      // });
      //
      // // Handle refund status
      // if (refund.status === 'processed') {
      //   const refundStatus = isPartialRefund ?
      //     'PARTIALLY_REFUNDED' : // This would be converted to your app's enum
      //     PaymentStatus.REFUNDED;
      //
      //   return {
      //     success: true,
      //     paymentId: payment.id,
      //     orderId: payment.orderId,
      //     status: refundStatus,
      //     message: isPartialRefund ?
      //       `Payment partially refunded (${amount})` :
      //       'Payment fully refunded',
      //     transactionId: refund.id,
      //   };
      // } else {
      //   throw new Error(`Refund failed with status: ${refund.status}`);
      // }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Razorpay refund processing took ${processingTime}ms`);

      // For the mock implementation
      const isPartialRefund =
        amount && amount < parseFloat(payment.amount.toString());

      // Simulate successful refund
      return {
        success: true,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: PaymentStatus.REFUNDED, // In real impl, use PARTIALLY_REFUNDED for partial
        message: isPartialRefund
          ? `Payment partially refunded (${amount})`
          : 'Payment fully refunded',
        transactionId: `rfnd_${uuidv4().replace(/-/g, '')}`,
      };
    } catch (error) {
      this.logger.error(
        `Razorpay refund failed: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        message: `Razorpay refund failed: ${error.message}`,
        error: error,
      };
    }
  }
}
