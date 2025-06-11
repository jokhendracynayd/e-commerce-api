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
import { CreatePaymentIntentDto, RefundPaymentDto, VerifyPaymentDto } from './dto';
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
import { PaymentIntentResponseDto, PaymentResultResponseDto } from './dto/payment-response.dto';
import { WebhookVerifier } from './utils/webhook-verifier';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimited } from '../../common/decorators/rate-limit.decorator';
import { StripeProvider } from './providers/stripe.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { CodProvider } from './providers/cod.provider';
import { PaymentEncryptionUtil } from './utils/payment-encryption.utils';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PaymentThrottlerGuard } from './guards/payment-throttler.guard';

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
    @Req() req: RequestWithUser
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
  async getPaymentsByOrderId(@Param('orderId') orderId: string, @Req() req: RequestWithUser) {
    return this.paymentsService.getPaymentsByOrderId(orderId);
  }

  @Public()
  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe payment webhooks' })
  async handleStripeWebhook(@Body() payload: any, @Req() req: RawBodyRequest<any>) {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    // Raw body is needed for Stripe webhook signature verification
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
    
    // Verify the webhook signature
    const isValid = this.webhookVerifier.verifyStripeWebhook(rawBody, signature as string);
    
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
        await this.paymentsService.handlePaymentRequiresAction(payload.data.object);
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
      signature as string
    );
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }

    // Handle different event types
    switch (payload.event) {
      case 'payment.captured':
        await this.paymentsService.handlePaymentSucceeded(payload.payload.payment.entity);
        break;
      case 'payment.failed':
        await this.paymentsService.handlePaymentFailed(payload.payload.payment.entity);
        break;
      case 'refund.processed':
        await this.paymentsService.handlePaymentRefunded(payload.payload.refund.entity);
        break;
      // Add other event types as needed
    }
    
    // Return a 200 OK quickly to acknowledge receipt
    return { received: true, provider: 'razorpay' };
  }
}
