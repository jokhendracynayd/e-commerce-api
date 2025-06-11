import { PaymentResult } from '../interfaces/payment.interface';
import { CreatePaymentIntentDto } from '../dto';

/**
 * Interface that all payment providers must implement
 */
export interface PaymentProviderInterface {
  /**
   * Creates a payment intent with the provider
   */
  createPaymentIntent(dto: CreatePaymentIntentDto): Promise<Record<string, any>>;
  
  /**
   * Verifies a payment
   */
  verifyPayment(payment: any, providerPaymentId: string, signature?: string): Promise<PaymentResult>;
  
  /**
   * Process a refund
   */
  processRefund(payment: any, amount?: number, reason?: string): Promise<PaymentResult>;
} 