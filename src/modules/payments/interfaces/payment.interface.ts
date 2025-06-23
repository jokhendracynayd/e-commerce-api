import { PaymentStatus } from '@prisma/client';

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  RAZORPAY = 'RAZORPAY',
  PAYPAL = 'PAYPAL',
  COD = 'COD', // Cash on Delivery
  UPI = 'UPI', // For Indian payment methods
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  UPI = 'UPI',
  NET_BANKING = 'NET_BANKING',
  WALLET = 'WALLET',
  COD = 'COD',
  PAYPAL = 'PAYPAL',
}

export interface PaymentIntent {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerPaymentId?: string;
  paymentMethod: PaymentMethod;
  metadata?: Record<string, any>;
  customerEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentIntentDto {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  provider: PaymentProvider;
  customerEmail?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId: string;
  status: PaymentStatus;
  message?: string;
  transactionId?: string;
  error?: any;
  providerResponse?: any;
}

export interface VerifyPaymentDto {
  paymentId: string;
  providerPaymentId: string;
  signature?: string; // For providers that use signatures for verification
}

export interface RefundPaymentDto {
  paymentId: string;
  amount?: number; // Optional for partial refunds
  reason?: string;
}
