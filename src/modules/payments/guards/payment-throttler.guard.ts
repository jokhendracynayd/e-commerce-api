import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Throttler guard specifically for payment operations
 * Uses stricter rate limits defined in the rate-limit.module
 */
@Injectable()
export class PaymentThrottlerGuard extends ThrottlerGuard {
  /**
   * Override to use the payment-specific throttler
   */
  protected getTrackers(): string[] {
    return ['payment'];
  }
}
