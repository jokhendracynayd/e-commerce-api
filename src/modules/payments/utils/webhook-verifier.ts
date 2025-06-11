import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookVerifier {
  constructor(private configService: ConfigService) {}

  /**
   * Verify a webhook signature from Stripe
   * @param payload The raw payload (request body as string)
   * @param signature The provided signature from Stripe in header
   * @returns boolean indicating if the signature is valid
   */
  verifyStripeWebhook(payload: string, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        throw new Error('Missing Stripe webhook secret');
      }

      // Split the signature into timestamp and signatures
      const parts = signature.split(',');
      const timestampPart = parts.find(part => part.startsWith('t='));
      const signaturesPart = parts.find(part => part.startsWith('v1='));

      if (!timestampPart || !signaturesPart) {
        throw new Error('Invalid Stripe signature format');
      }

      const timestamp = timestampPart.substring(2);
      const signatureProvided = signaturesPart.substring(3);

      // Create the signature string that Stripe expects
      const signedPayload = `${timestamp}.${payload}`;
      
      // Generate HMAC signature using the webhook secret
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(signedPayload);
      const calculatedSignature = hmac.digest('hex');

      // Compare signatures using a constant-time comparison function to avoid timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(calculatedSignature), 
        Buffer.from(signatureProvided)
      );
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      return false;
    }
  }

  /**
   * Verify a webhook signature from Razorpay
   * @param payload The raw payload (request body)
   * @param signature The provided signature from Razorpay
   * @returns boolean indicating if the signature is valid
   */
  verifyRazorpayWebhook(payload: string, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        throw new Error('Missing Razorpay webhook secret');
      }

      // Generate HMAC signature using the webhook secret
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(payload);
      const calculatedSignature = hmac.digest('hex');

      // Compare signatures using a constant-time comparison function
      return crypto.timingSafeEqual(
        Buffer.from(calculatedSignature), 
        Buffer.from(signature)
      );
    } catch (error) {
      console.error('Razorpay webhook verification error:', error);
      return false;
    }
  }
} 