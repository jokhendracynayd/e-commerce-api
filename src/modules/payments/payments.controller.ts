import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  RawBodyRequest,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentIntentDto,
  RefundPaymentDto,
  VerifyPaymentDto,
} from './dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import {
  PaymentIntentResponseDto,
  PaymentResultResponseDto,
} from './dto/payment-response.dto';
import { WebhookVerifier } from './utils/webhook-verifier';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimited } from '../../common/decorators/rate-limit.decorator';
import { StripeProvider } from './providers/stripe.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { CodProvider } from './providers/cod.provider';
import { PaymentEncryptionUtil } from './utils/payment-encryption.utils';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PaymentThrottlerGuard } from './guards/payment-throttler.guard';
import { UpiProvider } from './providers/upi.provider';

// Request with user interface for authenticated requests
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

@ApiTags('payments')
@Controller('payments')
@UseGuards(PaymentThrottlerGuard)
@RateLimited()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly webhookVerifier: WebhookVerifier,
    private readonly stripeProvider: StripeProvider,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly codProvider: CodProvider,
    private readonly upiProvider: UpiProvider,
    private readonly encryptionUtil: PaymentEncryptionUtil,
  ) {}

  @Post('create-intent')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a payment intent for an order' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment intent created successfully',
    type: PaymentIntentResponseDto,
  })
  @ApiBody({ type: CreatePaymentIntentDto })
  @ApiBearerAuth('JWT-auth')
  @RateLimited()
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @Req() req: RequestWithUser,
  ) {
    // Add the user's email to the DTO if available and not already provided
    if (!createPaymentIntentDto.customerEmail && req.user?.email) {
      createPaymentIntentDto.customerEmail = req.user.email;
    }

    return this.paymentsService.createPaymentIntent(createPaymentIntentDto);
  }

  @Post('verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Verify a payment' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment verified successfully',
    type: PaymentResultResponseDto,
  })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiBearerAuth('JWT-auth')
  @RateLimited()
  async verifyPayment(@Body() verifyPaymentDto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(verifyPaymentDto);
  }

  @Post('refund')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: 'Process a refund' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund processed successfully',
    type: PaymentResultResponseDto,
  })
  @ApiBody({ type: RefundPaymentDto })
  @ApiBearerAuth('JWT-auth')
  @RateLimited()
  async refundPayment(@Body() refundPaymentDto: RefundPaymentDto) {
    return this.paymentsService.refundPayment(refundPaymentDto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment details',
    type: PaymentIntentResponseDto,
  })
  @ApiBearerAuth('JWT-auth')
  async getPaymentById(@Param('id') id: string) {
    return this.paymentsService.getPaymentById(id);
  }

  @Get('order/:orderId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get payments for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of payments for the order',
    type: [PaymentIntentResponseDto],
  })
  @ApiBearerAuth('JWT-auth')
  async getPaymentsByOrderId(
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.paymentsService.getPaymentsByOrderId(orderId);
  }

  @Public()
  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe payment webhooks' })
  async handleStripeWebhook(
    @Body() payload: any,
    @Req() req: RawBodyRequest<any>,
  ) {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    // Raw body is needed for Stripe webhook signature verification
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);

    // Verify the webhook signature
    const isValid = this.webhookVerifier.verifyStripeWebhook(
      rawBody,
      signature as string,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid Stripe webhook signature');
    }

    // Handle different event types
    switch (payload.type) {
      case 'payment_intent.succeeded':
        await this.paymentsService.handlePaymentSucceeded(payload.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.paymentsService.handlePaymentFailed(payload.data.object);
        break;
      case 'payment_intent.requires_action':
        await this.paymentsService.handlePaymentRequiresAction(
          payload.data.object,
        );
        break;
      case 'charge.refunded':
        await this.paymentsService.handlePaymentRefunded(payload.data.object);
        break;
      // Add other event types as needed
    }

    // Return a 200 OK quickly to acknowledge receipt
    return { received: true, provider: 'stripe' };
  }

  @Public()
  @Post('webhooks/razorpay')
  @ApiOperation({ summary: 'Handle Razorpay payment webhooks' })
  async handleRazorpayWebhook(@Body() payload: any, @Req() req: any) {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      throw new BadRequestException('Missing Razorpay signature');
    }

    // Verify the webhook signature
    const isValid = this.webhookVerifier.verifyRazorpayWebhook(
      JSON.stringify(payload),
      signature as string,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }

    // Handle different event types
    switch (payload.event) {
      case 'payment.captured':
        await this.paymentsService.handlePaymentSucceeded(
          payload.payload.payment.entity,
        );
        break;
      case 'payment.failed':
        await this.paymentsService.handlePaymentFailed(
          payload.payload.payment.entity,
        );
        break;
      case 'refund.processed':
        await this.paymentsService.handlePaymentRefunded(
          payload.payload.refund.entity,
        );
        break;
      // Add other event types as needed
    }

    // Return a 200 OK quickly to acknowledge receipt
    return { received: true, provider: 'razorpay' };
  }

  @Public()
  @Post('webhooks/phonepe')
  @ApiOperation({ summary: 'Handle PhonePe UPI webhooks' })
  async handlePhonePeWebhook(
    @Body() payload: any,
    @Req() req: RawBodyRequest<any>,
  ) {
    const xVerify = req.headers['x-verify'];

    if (!xVerify) {
      throw new BadRequestException('Missing PhonePe X-VERIFY header');
    }

    // Raw body is needed for PhonePe webhook signature verification
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);

    // Verify the webhook signature
    const isValid = this.webhookVerifier.verifyPhonePeWebhook(
      rawBody,
      xVerify as string,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid PhonePe webhook signature');
    }

    // Map PhonePe payment status to our system's payment status
    // PhonePe payment statuses: SUCCESS, FAILED, PENDING
    if (
      payload.code === 'PAYMENT_SUCCESS' ||
      (payload.data && payload.data.responseCode === 'SUCCESS')
    ) {
      await this.paymentsService.handlePaymentSucceeded({
        id: payload.data?.transactionId,
        amount: payload.data?.amount,
        currency: 'INR',
        status: 'SUCCESS',
        metadata: {
          orderId: payload.data?.merchantOrderId,
          providerReferenceId: payload.data?.providerReferenceId,
          upiTransactionId: payload.data?.transactionId,
        },
      });
    } else if (
      payload.code === 'PAYMENT_ERROR' ||
      (payload.data && payload.data.responseCode === 'FAILURE')
    ) {
      await this.paymentsService.handlePaymentFailed({
        id: payload.data?.transactionId,
        amount: payload.data?.amount,
        currency: 'INR',
        status: 'FAILED',
        metadata: {
          orderId: payload.data?.merchantOrderId,
          errorCode: payload.data?.responseCode,
          errorMessage: payload.data?.responseMessage,
        },
      });
    }

    // Return a 200 OK quickly to acknowledge receipt
    return { received: true, provider: 'phonepe' };
  }

  @Public()
  @Post('webhooks/googlepay')
  @ApiOperation({ summary: 'Handle Google Pay UPI webhooks' })
  async handleGooglePayWebhook(
    @Body() payload: any,
    @Req() req: RawBodyRequest<any>,
  ) {
    const signature = req.headers['x-goog-signature'];

    if (!signature) {
      throw new BadRequestException('Missing Google Pay signature');
    }

    // Raw body is needed for Google Pay webhook signature verification
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);

    // Verify the webhook signature
    const isValid = this.webhookVerifier.verifyGooglePayWebhook(
      rawBody,
      signature as string,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid Google Pay webhook signature');
    }

    // Process Google Pay UPI webhook
    // Google Pay webhook structure varies based on integration type
    if (
      payload.eventType === 'PAYMENT_COMPLETE' ||
      payload.status === 'SUCCESS'
    ) {
      await this.paymentsService.handlePaymentSucceeded({
        id: payload.transactionId || payload.id,
        amount: payload.amount,
        currency: payload.currency || 'INR',
        status: 'SUCCESS',
        metadata: {
          orderId: payload.orderId || payload.merchantTransactionId,
          upiTransactionId: payload.upiTransactionId || payload.transactionId,
        },
      });
    } else if (
      payload.eventType === 'PAYMENT_FAILED' ||
      payload.status === 'FAILURE'
    ) {
      await this.paymentsService.handlePaymentFailed({
        id: payload.transactionId || payload.id,
        amount: payload.amount,
        currency: payload.currency || 'INR',
        status: 'FAILED',
        metadata: {
          orderId: payload.orderId || payload.merchantTransactionId,
          errorCode: payload.errorCode,
          errorMessage: payload.errorMessage,
        },
      });
    }

    // Return a 200 OK quickly to acknowledge receipt
    return { received: true, provider: 'googlepay' };
  }

  @Public()
  @Post('webhooks/paytm')
  @ApiOperation({ summary: 'Handle Paytm UPI webhooks' })
  async handlePaytmWebhook(@Body() payload: any) {
    // Paytm includes checksum in the payload itself
    // Verify the webhook signature
    const isValid = this.webhookVerifier.verifyPaytmWebhook(payload);

    if (!isValid) {
      throw new UnauthorizedException('Invalid Paytm webhook signature');
    }

    // Process Paytm webhook based on status
    // Paytm status values: TXN_SUCCESS, TXN_FAILURE, PENDING
    if (payload.STATUS === 'TXN_SUCCESS') {
      await this.paymentsService.handlePaymentSucceeded({
        id: payload.TXNID,
        amount: parseFloat(payload.TXNAMOUNT),
        currency: 'INR',
        status: 'SUCCESS',
        metadata: {
          orderId: payload.ORDERID,
          bankTxnId: payload.BANKTXNID,
          txnDate: payload.TXNDATE,
          gatewayName: payload.GATEWAYNAME,
          bankName: payload.BANKNAME,
          paymentMode: payload.PAYMENTMODE,
        },
      });
    } else if (payload.STATUS === 'TXN_FAILURE') {
      await this.paymentsService.handlePaymentFailed({
        id: payload.TXNID,
        amount: parseFloat(payload.TXNAMOUNT),
        currency: 'INR',
        status: 'FAILED',
        metadata: {
          orderId: payload.ORDERID,
          respCode: payload.RESPCODE,
          respMsg: payload.RESPMSG,
        },
      });
    }

    // Return a 200 OK quickly to acknowledge receipt
    return { received: true, provider: 'paytm' };
  }

  @Public()
  @Post('webhooks/bharatpe')
  @ApiOperation({ summary: 'Handle BharatPe UPI webhooks' })
  async handleBharatPeWebhook(
    @Body() payload: any,
    @Req() req: RawBodyRequest<any>,
  ) {
    const signature = req.headers['x-bharatpe-signature'];

    if (!signature) {
      throw new BadRequestException('Missing BharatPe signature');
    }

    // Raw body is needed for BharatPe webhook signature verification
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);

    // Verify the webhook signature
    const isValid = this.webhookVerifier.verifyBharatPeWebhook(
      rawBody,
      signature as string,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid BharatPe webhook signature');
    }

    // Process BharatPe webhook
    // BharatPe status values vary, common ones: SUCCESS, FAILED, PENDING
    if (payload.status === 'SUCCESS' || payload.txnStatus === 'SUCCESS') {
      await this.paymentsService.handlePaymentSucceeded({
        id: payload.txnId || payload.transactionId,
        amount: payload.amount,
        currency: 'INR',
        status: 'SUCCESS',
        metadata: {
          orderId: payload.merchantOrderId || payload.orderId,
          upiTransactionId: payload.upiTransactionId,
          merchantId: payload.merchantId,
        },
      });
    } else if (payload.status === 'FAILED' || payload.txnStatus === 'FAILED') {
      await this.paymentsService.handlePaymentFailed({
        id: payload.txnId || payload.transactionId,
        amount: payload.amount,
        currency: 'INR',
        status: 'FAILED',
        metadata: {
          orderId: payload.merchantOrderId || payload.orderId,
          errorCode: payload.errorCode,
          errorMessage: payload.errorMessage || payload.statusMessage,
        },
      });
    }

    // Return a 200 OK quickly to acknowledge receipt
    return { received: true, provider: 'bharatpe' };
  }
}
