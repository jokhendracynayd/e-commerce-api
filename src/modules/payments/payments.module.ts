import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../../common/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { OrdersModule } from '../orders/orders.module';
import { WebhookVerifier } from './utils/webhook-verifier';
import { CommonModule } from '../../common/common.module';
import { StripeProvider } from './providers/stripe.provider';
import { UpiProvider } from './providers/upi.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { CodProvider } from './providers/cod.provider';
import { PaymentEncryptionUtil } from './utils/payment-encryption.utils';
import { PaymentThrottlerGuard } from './guards/payment-throttler.guard';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    OrdersModule,
    CommonModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    WebhookVerifier,
    StripeProvider,
    UpiProvider,
    RazorpayProvider,
    CodProvider,
    PaymentEncryptionUtil,
    PaymentThrottlerGuard,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {} 