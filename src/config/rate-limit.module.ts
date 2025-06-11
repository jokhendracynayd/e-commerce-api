import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL', 60) * 1000, // Convert to ms, Default: 60 seconds
            limit: config.get('THROTTLE_LIMIT', 10),    // Default: 10 requests per TTL
          },
          // Payment-specific throttler with stricter limits
          {
            name: 'payment',
            ttl: config.get('PAYMENT_THROTTLE_TTL', 60) * 1000, // Convert to ms, Default: 60 seconds
            limit: config.get('PAYMENT_THROTTLE_LIMIT', 5),    // Default: 5 payment operations per TTL
          },
        ],
      }),
    }),
  ],
  exports: [ThrottlerModule],
})
export class RateLimitModule {} 