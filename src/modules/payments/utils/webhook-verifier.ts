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
      const webhookSecret = this.configService.get<string>(
        'STRIPE_WEBHOOK_SECRET',
      );

      if (!webhookSecret) {
        throw new Error('Missing Stripe webhook secret');
      }

      // Split the signature into timestamp and signatures
      const parts = signature.split(',');
      const timestampPart = parts.find((part) => part.startsWith('t='));
      const signaturesPart = parts.find((part) => part.startsWith('v1='));

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
        Buffer.from(signatureProvided),
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
      const webhookSecret = this.configService.get<string>(
        'RAZORPAY_WEBHOOK_SECRET',
      );

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
        Buffer.from(signature),
      );
    } catch (error) {
      console.error('Razorpay webhook verification error:', error);
      return false;
    }
  }

  /**
   * Verify a webhook signature from PhonePe
   * @param payload The raw payload (request body)
   * @param xVerify The provided X-VERIFY header from PhonePe
   * @returns boolean indicating if the signature is valid
   */
  verifyPhonePeWebhook(payload: string, xVerify: string): boolean {
    try {
      const saltKey = this.configService.get<string>('PHONEPE_SALT_KEY');
      const saltIndex =
        this.configService.get<string>('PHONEPE_SALT_INDEX') || '1';

      if (!saltKey) {
        throw new Error('Missing PhonePe salt key');
      }

      // PhonePe signature format: SHA256(payload + "/pg/v1/status" + saltKey) + "###" + saltIndex
      const verificationData = `${payload}/pg/v1/status${saltKey}`;
      const hmac = crypto.createHash('sha256');
      hmac.update(verificationData);
      const calculatedSignature = `${hmac.digest('hex')}###${saltIndex}`;

      return calculatedSignature === xVerify;
    } catch (error) {
      console.error('PhonePe webhook verification error:', error);
      return false;
    }
  }

  /**
   * Verify a webhook signature from Google Pay (UPI)
   * @param payload The raw payload (request body)
   * @param signature The provided signature from Google Pay
   * @returns boolean indicating if the signature is valid
   */
  verifyGooglePayWebhook(payload: string, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>(
        'GPAY_WEBHOOK_SECRET',
      );

      if (!webhookSecret) {
        throw new Error('Missing Google Pay webhook secret');
      }

      // Google Pay UPI verification
      // For merchant-initiated transactions:
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(payload);
      const calculatedSignature = hmac.digest('base64');

      return calculatedSignature === signature;
    } catch (error) {
      console.error('Google Pay webhook verification error:', error);
      return false;
    }
  }

  /**
   * Verify a webhook signature from Paytm UPI
   * @param payload The webhook payload
   * @returns boolean indicating if the signature is valid
   */
  verifyPaytmWebhook(payload: any): boolean {
    try {
      const paytmSecret = this.configService.get<string>('PAYTM_MERCHANT_KEY');

      if (!paytmSecret || !payload.checksum) {
        throw new Error('Missing Paytm secret or checksum in payload');
      }

      // Extract the checksum from the payload
      const checksum = payload.checksum;
      const payloadWithoutChecksum = { ...payload };
      delete payloadWithoutChecksum.checksum;

      // Convert payload to sorted query string
      const sortedParams = Object.keys(payloadWithoutChecksum)
        .sort()
        .map((key) => `${key}=${payloadWithoutChecksum[key]}`)
        .join('&');

      // Generate HMAC signature
      const hmac = crypto.createHmac('sha256', paytmSecret);
      hmac.update(sortedParams);
      const calculatedChecksum = hmac.digest('hex');

      return calculatedChecksum === checksum;
    } catch (error) {
      console.error('Paytm webhook verification error:', error);
      return false;
    }
  }

  /**
   * Verify a webhook signature from BharatPe UPI
   * @param payload The webhook payload
   * @param signatureHeader The provided signature header
   * @returns boolean indicating if the signature is valid
   */
  verifyBharatPeWebhook(payload: string, signatureHeader: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>(
        'BHARATPE_API_SECRET',
      );

      if (!webhookSecret || !signatureHeader) {
        throw new Error('Missing BharatPe secret or signature header');
      }

      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(payload);
      const calculatedSignature = hmac.digest('hex');

      return calculatedSignature === signatureHeader;
    } catch (error) {
      console.error('BharatPe webhook verification error:', error);
      return false;
    }
  }
}
