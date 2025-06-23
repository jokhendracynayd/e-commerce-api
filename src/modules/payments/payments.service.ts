import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PaymentStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  CreatePaymentIntentDto,
  RefundPaymentDto,
  VerifyPaymentDto,
} from './dto';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentResult,
} from './interfaces/payment.interface';
import { AppLogger } from '../../common/services/logger.service';
import { StripeProvider } from './providers/stripe.provider';
import { UpiProvider } from './providers/upi.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { CodProvider } from './providers/cod.provider';
import { PaymentEncryptionUtil } from './utils/payment-encryption.utils';

// Add enum for additional payment statuses not in Prisma schema
enum ExtendedPaymentStatus {
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

@Injectable()
export class PaymentsService {
  // Map of providers to their implementation
  private readonly providers: Record<string, any> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    private readonly stripeProvider: StripeProvider,
    private readonly upiProvider: UpiProvider,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly codProvider: CodProvider,
    private readonly encryptionUtil: PaymentEncryptionUtil,
  ) {
    this.logger.setContext('PaymentsService');

    // Register providers
    this.providers[PaymentProvider.STRIPE] = this.stripeProvider;
    this.providers[PaymentProvider.UPI] = this.upiProvider;
    this.providers[PaymentProvider.RAZORPAY] = this.razorpayProvider;
    this.providers[PaymentProvider.COD] = this.codProvider;
    // Add more providers as they are implemented
  }

  /**
   * Create a payment intent for an order
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    try {
      // Start timing for metrics
      const startTime = Date.now();

      // Set idempotency key if not provided
      if (!dto.idempotencyKey) {
        dto.idempotencyKey = `order_${dto.orderId}_${Date.now()}`;
      }

      // Verify the order exists and is in valid state for payment
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: { user: true },
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        throw new ConflictException(`Order ${dto.orderId} is already paid`);
      }

      // Check for idempotency - if we already have a pending payment with this key
      if (dto.idempotencyKey) {
        const existingPayment = await this.prisma.payment.findFirst({
          where: {
            orderId: dto.orderId,
            status: { in: [PaymentStatus.PENDING] },
            metadata: {
              path: ['idempotencyKey'],
              equals: dto.idempotencyKey,
            },
          },
        });

        if (existingPayment) {
          this.logger.log(
            `Found existing payment using idempotency key: ${dto.idempotencyKey}`,
          );
          return this.formatPaymentResponse(existingPayment);
        }
      }

      // Create payment entry data
      let clientData: Record<string, any> = {};

      // Provider-specific handling using the provider interface
      const provider = this.providers[dto.provider];
      if (!provider) {
        throw new BadRequestException(
          `Unsupported payment provider: ${dto.provider}`,
        );
      }

      clientData = await provider.createPaymentIntent(dto);

      // Prepare metadata with encryption for sensitive data
      const metadata: Record<string, any> = {
        ...(dto.metadata || {}),
        idempotencyKey: dto.idempotencyKey,
      };

      // Encrypt any sensitive data in metadata
      if (metadata.cardDetails) {
        metadata.cardDetails = this.encryptionUtil.encrypt(
          metadata.cardDetails,
        );
      }

      // Save payment intent in database
      const payment = await this.prisma.payment.create({
        data: {
          orderId: dto.orderId,
          amount: dto.amount,
          currency: dto.currency,
          status: PaymentStatus.PENDING,
          provider: dto.provider,
          paymentMethod: dto.paymentMethod,
          metadata: metadata,
          customerEmail: dto.customerEmail || order.user?.email,
          providerPaymentId: clientData.id || null,
        },
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Created payment intent for order ${dto.orderId} in ${processingTime}ms`,
      );
      return this.formatPaymentResponse(payment, clientData);
    } catch (error) {
      this.logger.error(
        `Failed to create payment intent: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create payment intent');
    }
  }

  /**
   * Verify and complete a payment
   */
  async verifyPayment(dto: VerifyPaymentDto): Promise<PaymentResult> {
    try {
      const startTime = Date.now();

      const payment = await this.prisma.payment.findUnique({
        where: { id: dto.paymentId },
        include: { order: true },
      });

      if (!payment) {
        throw new NotFoundException(
          `Payment with ID ${dto.paymentId} not found`,
        );
      }

      if (payment.status === PaymentStatus.PAID) {
        return {
          success: true,
          paymentId: payment.id,
          orderId: payment.orderId,
          status: PaymentStatus.PAID,
          message: 'Payment already verified',
        };
      }

      // Get the appropriate provider
      const provider = this.providers[payment.provider];
      if (!provider) {
        throw new BadRequestException(
          `Unsupported payment provider: ${payment.provider}`,
        );
      }

      // Provider-specific verification using the provider interface
      const verificationResult = await provider.verifyPayment(
        payment,
        dto.providerPaymentId,
        dto.signature,
      );

      // If payment verification is successful
      if (verificationResult.success) {
        // Update the payment status
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: verificationResult.status,
            providerPaymentId: dto.providerPaymentId,
            updatedAt: new Date(),
          },
        });

        // Update the order's payment status
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: verificationResult.status,
          },
        });

        const processingTime = Date.now() - startTime;
        this.logger.log(
          `Payment ${payment.id} verified successfully in ${processingTime}ms`,
        );
      }

      return verificationResult;
    } catch (error) {
      this.logger.error(
        `Failed to verify payment: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  /**
   * Process a refund
   */
  async refundPayment(dto: RefundPaymentDto): Promise<PaymentResult> {
    try {
      const startTime = Date.now();

      const payment = await this.prisma.payment.findUnique({
        where: { id: dto.paymentId },
        include: { order: true },
      });

      if (!payment) {
        throw new NotFoundException(
          `Payment with ID ${dto.paymentId} not found`,
        );
      }

      if (payment.status !== PaymentStatus.PAID) {
        throw new BadRequestException(
          `Cannot refund payment with status ${payment.status}`,
        );
      }

      // Get the appropriate provider
      const provider = this.providers[payment.provider];
      if (!provider) {
        throw new BadRequestException(
          `Unsupported payment provider for refunds: ${payment.provider}`,
        );
      }

      // Provider-specific refund processing using the provider interface
      const refundResult = await provider.processRefund(
        payment,
        dto.amount,
        dto.reason,
      );

      // If refund is successful
      if (refundResult.success) {
        // Update payment status
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            updatedAt: new Date(),
          },
        });

        // Update order status
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
            status: OrderStatus.REFUNDED,
          },
        });

        const processingTime = Date.now() - startTime;
        this.logger.log(
          `Payment ${payment.id} refunded successfully in ${processingTime}ms`,
        );
      }

      return refundResult;
    } catch (error) {
      this.logger.error(
        `Failed to process refund: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string) {
    try {
      const startTime = Date.now();

      const payment = await this.prisma.payment.findUnique({
        where: { id },
        include: { order: true },
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${id} not found`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Retrieved payment ${id} in ${processingTime}ms`);

      return this.formatPaymentResponse(payment);
    } catch (error) {
      this.logger.error(
        `Error retrieving payment ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to retrieve payment with ID ${id}`,
      );
    }
  }

  /**
   * Get payments for an order
   */
  async getPaymentsByOrderId(orderId: string) {
    try {
      const startTime = Date.now();

      const payments = await this.prisma.payment.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Retrieved ${payments.length} payments for order ${orderId} in ${processingTime}ms`,
      );

      return payments.map((payment) => this.formatPaymentResponse(payment));
    } catch (error) {
      this.logger.error(
        `Error retrieving payments for order ${orderId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve payments for order ${orderId}`,
      );
    }
  }

  /**
   * Format payment response
   */
  private formatPaymentResponse(
    payment: any,
    clientData?: Record<string, any>,
  ) {
    // Extract relevant payment info
    const paymentResponse = {
      id: payment.id,
      orderId: payment.orderId,
      amount: parseFloat(payment.amount.toString()),
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      paymentMethod: payment.paymentMethod,
      customerEmail: payment.customerEmail,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };

    // Process metadata with sensitive information
    if (payment.metadata) {
      const metadata = { ...payment.metadata };

      // Decrypt sensitive data if encrypted
      if (metadata.cardDetails && typeof metadata.cardDetails === 'string') {
        try {
          const decryptedCard = this.encryptionUtil.decrypt(
            metadata.cardDetails,
          );

          // Only include masked version in response
          if (decryptedCard.number) {
            metadata.maskedCardNumber = this.encryptionUtil.maskCardNumber(
              decryptedCard.number,
            );
            delete metadata.cardDetails; // Don't send encrypted details to client
          }
        } catch (error) {
          this.logger.error(`Failed to decrypt card details: ${error.message}`);
        }
      }

      // Remove any sensitive fields from metadata
      delete metadata.cvv;
      delete metadata.pin;
      delete metadata.password;

      paymentResponse['metadata'] = metadata;
    }

    // Add client-specific data if available
    if (clientData) {
      paymentResponse['clientData'] = clientData;
    }

    return paymentResponse;
  }

  /**
   * Handler for successful payment webhook events
   */
  async handlePaymentSucceeded(paymentData: any): Promise<void> {
    try {
      const { id, metadata } = paymentData;
      const orderId = metadata?.orderId || paymentData.orderId;

      if (!orderId) {
        this.logger.error(
          `Payment succeeded but no orderId found in metadata: ${JSON.stringify(paymentData)}`,
        );
        return;
      }

      // Find the payment by provider payment ID
      const payment = await this.prisma.payment.findFirst({
        where: {
          providerPaymentId: id,
          orderId: orderId,
        },
      });

      if (!payment) {
        this.logger.error(`Payment not found for provider payment ID: ${id}`);
        return;
      }

      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          updatedAt: new Date(),
        },
      });

      // Update order status
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          // Only update the order status if it's still in PENDING
          status: {
            set: OrderStatus.PROCESSING,
          },
        },
      });

      this.logger.log(`Payment ${payment.id} updated to PAID via webhook`);
    } catch (error) {
      this.logger.error(
        `Error processing payment success webhook: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handler for failed payment webhook events
   */
  async handlePaymentFailed(paymentData: any): Promise<void> {
    try {
      const { id, metadata } = paymentData;
      const orderId = metadata?.orderId || paymentData.orderId;

      if (!orderId) {
        this.logger.error(
          `Payment failed but no orderId found in metadata: ${JSON.stringify(paymentData)}`,
        );
        return;
      }

      // Find the payment by provider payment ID
      const payment = await this.prisma.payment.findFirst({
        where: {
          providerPaymentId: id,
          orderId: orderId,
        },
      });

      if (!payment) {
        this.logger.error(`Payment not found for provider payment ID: ${id}`);
        return;
      }

      // Update payment status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Payment ${payment.id} updated to FAILED via webhook`);
    } catch (error) {
      this.logger.error(
        `Error processing payment failure webhook: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handler for payment_intent.requires_action webhook events (e.g., 3D Secure authentication)
   */
  async handlePaymentRequiresAction(paymentData: any): Promise<void> {
    try {
      const { id, metadata } = paymentData;
      const orderId = metadata?.orderId || paymentData.orderId;

      if (!orderId) {
        this.logger.error(
          `Payment requires action but no orderId found in metadata: ${JSON.stringify(paymentData)}`,
        );
        return;
      }

      // Find the payment by provider payment ID
      const payment = await this.prisma.payment.findFirst({
        where: {
          providerPaymentId: id,
          orderId: orderId,
        },
      });

      if (!payment) {
        this.logger.error(`Payment not found for provider payment ID: ${id}`);
        return;
      }

      // Store the next action info in the payment metadata
      const nextAction = paymentData.next_action || null;
      const currentMetadata = payment.metadata || {};

      // Update payment with next action data
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          // We'll use PaymentStatus.PENDING since Prisma schema might not have REQUIRES_ACTION
          status: PaymentStatus.PENDING,
          metadata: {
            ...JSON.parse(JSON.stringify(currentMetadata)),
            requiresAction: true,
            nextAction: nextAction,
            nextActionType: nextAction?.type || 'unknown',
            nextActionUrl: nextAction?.redirect_to_url?.url || null,
          },
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Payment ${payment.id} updated to REQUIRES_ACTION via webhook`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing payment requires action webhook: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handler for charge.refunded webhook events (handles both full and partial refunds)
   */
  async handlePaymentRefunded(paymentData: any): Promise<void> {
    try {
      // For Stripe, look for the payment intent ID in the charge object
      const paymentIntentId = paymentData.payment_intent;
      const isFullRefund = paymentData.refunded || false; // True if fully refunded
      const refundAmount = paymentData.amount_refunded || 0;
      const totalAmount = paymentData.amount || 0;

      if (!paymentIntentId) {
        this.logger.error(
          `Refund event has no payment_intent ID: ${JSON.stringify(paymentData)}`,
        );
        return;
      }

      // Find the payment by provider payment ID
      const payment = await this.prisma.payment.findFirst({
        where: {
          providerPaymentId: paymentIntentId,
        },
        include: { order: true },
      });

      if (!payment) {
        this.logger.error(
          `Payment not found for provider payment ID: ${paymentIntentId}`,
        );
        return;
      }

      // Get current metadata and update with refund information
      const currentMetadata = payment.metadata || {};

      // Determine the refund status based on whether it's a full or partial refund
      const refundStatus = isFullRefund
        ? PaymentStatus.REFUNDED
        : PaymentStatus.REFUNDED; // In real implementation use PARTIALLY_REFUNDED if available

      // Update payment with refund data
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: refundStatus,
          metadata: {
            ...JSON.parse(JSON.stringify(currentMetadata)),
            refunded: isFullRefund,
            refundAmount: refundAmount / 100, // Convert from smallest currency unit
            totalAmount: totalAmount / 100,
            refundReason: paymentData.refunds?.data[0]?.reason || 'unknown',
            refundedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
      });

      // Update order status for full refunds
      if (isFullRefund && payment.order) {
        await this.prisma.order.update({
          where: { id: payment.order.id },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
            status: OrderStatus.REFUNDED,
          },
        });
      }
      // For partial refunds, we'd just update order metadata but not change status
      else if (payment.order) {
        // Add logic for partial refund order updates if your schema supports it
        // For now, just log that this happened
        this.logger.log(
          `Partial refund processed for order ${payment.order.id}`,
        );
      }

      this.logger.log(
        `Payment ${payment.id} updated to ${refundStatus} via webhook`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing payment refund webhook: ${error.message}`,
        error.stack,
      );
    }
  }
}
