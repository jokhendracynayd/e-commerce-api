import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus } from '@prisma/client';
import { CreatePaymentIntentDto } from '../dto';
import { PaymentResult, PaymentProvider } from '../interfaces/payment.interface';
import { PaymentProviderInterface } from './payment-provider.interface';
import { AppLogger } from '../../../common/services/logger.service';
import axios from 'axios';
import * as crypto from 'crypto';

interface UPIStatusMap {
  [key: string]: PaymentStatus;
}

// Extended payment status enum for statuses not in Prisma schema
export enum ExtendedPaymentStatus {
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REQUIRES_ACTION = 'REQUIRES_ACTION'
}

@Injectable()
export class UpiProvider implements PaymentProviderInterface {
  // UPI status mapping for different providers
  private readonly upiStatusMap: UPIStatusMap = {
    // PhonePe status mapping
    'SUCCESS': PaymentStatus.PAID,
    'PAYMENT_SUCCESS': PaymentStatus.PAID,
    'FAILED': PaymentStatus.FAILED,
    'PAYMENT_ERROR': PaymentStatus.FAILED,
    'PENDING': PaymentStatus.PENDING,
    // GooglePay status mapping
    'COMPLETED': PaymentStatus.PAID,
    'PAYMENT_COMPLETE': PaymentStatus.PAID,
    'PAYMENT_FAILED': PaymentStatus.FAILED,
    'DECLINED': PaymentStatus.FAILED,
    // Paytm status mapping
    'TXN_SUCCESS': PaymentStatus.PAID,
    'TXN_FAILURE': PaymentStatus.FAILED,
    // BharatPe status mapping
    'AUTHORIZED': PaymentStatus.PAID,
    // Common UPI statuses
    'COLLECTED': PaymentStatus.PAID,
    'INITIATED': PaymentStatus.PENDING,
    'AUTHORIZATION_FAILED': PaymentStatus.FAILED,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('UpiProvider');
  }

  /**
   * Create a payment intent with UPI
   * Supports multiple UPI providers based on configuration
   */
  async createPaymentIntent(
    dto: CreatePaymentIntentDto,
  ): Promise<Record<string, any>> {
    try {
      // Get configuration based on the UPI provider specified or default
      const upiProvider = dto.metadata?.upiProvider || this.configService.get<string>('UPI_DEFAULT_PROVIDER') || 'phonepe';
      
      // Set provider-specific configuration
      const config = this.getUpiProviderConfig(upiProvider);
      if (!config) {
        throw new InternalServerErrorException(`UPI configuration missing for provider: ${upiProvider}`);
      }

      // Record metrics
      const startTime = Date.now();
      
      // Generate transaction ID if not provided
      const transactionId = dto.metadata?.transactionId || `upi_${uuidv4().replace(/-/g, '')}`;
      
      // Add idempotency key if provided
      const options: Record<string, any> = {};
      if (dto.idempotencyKey) {
        options.idempotencyKey = dto.idempotencyKey;
        this.logger.log(`Using idempotency key: ${dto.idempotencyKey}`);
      }

      let result: Record<string, any>;
      
      // Provider-specific implementations
      switch (upiProvider.toLowerCase()) {
        case 'phonepe':
          result = await this.createPhonePeIntent(dto, transactionId, config);
          break;
        case 'googlepay':
          result = await this.createGooglePayIntent(dto, transactionId, config);
          break;
        case 'paytm':
          result = await this.createPaytmIntent(dto, transactionId, config);
          break;
        case 'bharatpe':
          result = await this.createBharatPeIntent(dto, transactionId, config);
          break;
        default:
          // Default UPI flow with generic UPI deep links
          result = this.createGenericUpiIntent(dto, transactionId, config);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`UPI payment intent (${upiProvider}) creation took ${processingTime}ms`);

      return {
        id: transactionId,
        ...result,
        amount: dto.amount,
        currency: dto.currency,
        provider: upiProvider,
      };
    } catch (error) {
      this.logger.error(`Error creating UPI payment intent: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to create UPI payment intent: ${error.message}`);
    }
  }

  /**
   * Verify a UPI payment
   * In UPI, verification typically happens through callback URLs or by checking payment status using transaction ID
   */
  async verifyPayment(
    payment: any,
    providerPaymentId: string,
    signature?: string,
  ): Promise<PaymentResult> {
    try {
      // Get UPI provider from payment metadata or fall back to default
      const upiProvider = payment.metadata?.upiProvider || 
                          payment.metadata?.provider ||
                          this.configService.get<string>('UPI_DEFAULT_PROVIDER') || 
                          'phonepe';
      
      // Set provider-specific configuration
      const config = this.getUpiProviderConfig(upiProvider);
      if (!config) {
        throw new Error(`UPI configuration missing for provider: ${upiProvider}`);
      }

      const startTime = Date.now();
      
      // If signature provided, verify it first (for providers that support it)
      if (signature && config.verifySignature) {
        const isValid = await this.verifyUpiSignature(providerPaymentId, signature, config);
        if (!isValid) {
          throw new Error(`Invalid UPI signature for payment: ${payment.id}`);
        }
      }
      
      // Check payment status with provider API
      // Different providers have different APIs for status checking
      let verificationResult: any;
      
      switch (upiProvider.toLowerCase()) {
        case 'phonepe':
          verificationResult = await this.verifyPhonePePayment(payment, providerPaymentId, config);
          break;
        case 'googlepay':
          verificationResult = await this.verifyGooglePayPayment(payment, providerPaymentId, config);
          break;
        case 'paytm':
          verificationResult = await this.verifyPaytmPayment(payment, providerPaymentId, config);
          break;
        case 'bharatpe':
          verificationResult = await this.verifyBharatPePayment(payment, providerPaymentId, config);
          break;
        default:
          // For providers without API verification, we trust the client-provided status
          // In production, you should always verify with the provider
          verificationResult = { status: 'SUCCESS' };
      }
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`UPI payment verification took ${processingTime}ms`);
      
      // Map provider status to our status
      const paymentStatus = this.mapUpiStatus(verificationResult.status);
      
      return {
        success: paymentStatus === PaymentStatus.PAID,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: paymentStatus,
        message: `UPI payment ${paymentStatus.toLowerCase()}`,
        transactionId: providerPaymentId,
        providerResponse: verificationResult,
      };
    } catch (error) {
      this.logger.error(`UPI payment verification failed: ${error.message}`, error.stack);
      return {
        success: false,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        message: `UPI payment verification failed: ${error.message}`,
        error: error,
      };
    }
  }

  /**
   * Process a refund for UPI payment
   */
  async processRefund(
    payment: any,
    amount?: number,
    reason?: string,
  ): Promise<PaymentResult> {
    try {
      // Get UPI provider from payment metadata or fall back to default
      const upiProvider = payment.metadata?.upiProvider || 
                          payment.metadata?.provider ||
                          this.configService.get<string>('UPI_DEFAULT_PROVIDER') || 
                          'phonepe';
      
      // Set provider-specific configuration
      const config = this.getUpiProviderConfig(upiProvider);
      if (!config) {
        throw new Error(`UPI configuration missing for provider: ${upiProvider}`);
      }

      const startTime = Date.now();
      const refundId = `refund_${uuidv4().replace(/-/g, '')}`;
      const refundAmount = amount || payment.amount;
      const isPartialRefund = amount && amount < parseFloat(payment.amount.toString());
      
      // For both partial and full refunds, use REFUNDED status
      // The partial refund information is captured in the message and metadata
      const refundStatus = PaymentStatus.REFUNDED;
      
      let refundResult: any;
      
      // Process refund using provider-specific API
      switch (upiProvider.toLowerCase()) {
        case 'phonepe':
          refundResult = await this.refundPhonePePayment(payment, refundAmount, refundId, config);
          break;
        case 'paytm':
          refundResult = await this.refundPaytmPayment(payment, refundAmount, refundId, config);
          break;
        case 'googlepay':
        case 'bharatpe':
        default:
          // Some UPI providers don't have direct refund APIs and require manual process
          // For those, we log the request and assume success (for testing)
          this.logger.log(`Manual refund required for UPI provider ${upiProvider}: Payment ID ${payment.id}, Amount ${refundAmount}`);
          refundResult = { status: 'SUCCESS', refundId };
      }
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`UPI refund processing took ${processingTime}ms`);
      
      return {
        success: true,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: refundStatus,
        message: isPartialRefund ? 
          `UPI payment partially refunded (${refundAmount})` : 
          'UPI payment fully refunded',
        transactionId: refundId,
        providerResponse: {
          ...refundResult,
          isPartialRefund: isPartialRefund,
          refundAmount: refundAmount,
          originalAmount: payment.amount
        }
      };
    } catch (error) {
      this.logger.error(`UPI refund failed: ${error.message}`, error.stack);
      return {
        success: false,
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        message: `UPI refund failed: ${error.message}`,
        error: error,
      };
    }
  }

  /**
   * Map UPI provider status to our payment status
   */
  private mapUpiStatus(providerStatus: string): PaymentStatus {
    // Convert to uppercase to make matching case-insensitive
    const status = providerStatus.toUpperCase();
    
    if (this.upiStatusMap[status]) {
      return this.upiStatusMap[status];
    }
    
    // Default mappings for common terms
    if (status.includes('SUCCESS') || status.includes('COMPLETE') || status.includes('PAID') || status.includes('CAPTURED')) {
      return PaymentStatus.PAID;
    }
    
    if (status.includes('FAIL') || status.includes('DECLINE') || status.includes('REJECT') || status.includes('ERROR')) {
      return PaymentStatus.FAILED;
    }
    
    if (status.includes('PEND') || status.includes('WAIT') || status.includes('PROCESS')) {
      return PaymentStatus.PENDING;
    }
    
    if (status.includes('REFUND')) {
      return PaymentStatus.REFUNDED;
    }
    
    // Default to pending for unknown statuses
    return PaymentStatus.PENDING;
  }

  /**
   * Get configuration for specified UPI provider
   */
  private getUpiProviderConfig(provider: string): Record<string, any> {
    const lowerProvider = provider.toLowerCase();
    
    switch (lowerProvider) {
      case 'phonepe':
        return {
          merchantId: this.configService.get<string>('PHONEPE_MERCHANT_ID'),
          saltKey: this.configService.get<string>('PHONEPE_SALT_KEY'),
          saltIndex: this.configService.get<string>('PHONEPE_SALT_INDEX') || '1',
          apiBaseUrl: this.configService.get<string>('PHONEPE_API_URL') || 'https://api.phonepe.com/apis/hermes',
          callbackUrl: this.configService.get<string>('PHONEPE_CALLBACK_URL'),
          verifySignature: true
        };
        
      case 'googlepay':
        return {
          merchantId: this.configService.get<string>('GPAY_MERCHANT_ID'),
          merchantName: this.configService.get<string>('GPAY_MERCHANT_NAME') || 'Your Store',
          apiKey: this.configService.get<string>('GPAY_API_KEY'),
          apiBaseUrl: this.configService.get<string>('GPAY_API_URL'),
          callbackUrl: this.configService.get<string>('GPAY_CALLBACK_URL'),
          verifySignature: false
        };
        
      case 'paytm':
        return {
          merchantId: this.configService.get<string>('PAYTM_MERCHANT_ID'),
          merchantKey: this.configService.get<string>('PAYTM_MERCHANT_KEY'),
          website: this.configService.get<string>('PAYTM_WEBSITE') || 'DEFAULT',
          industryType: this.configService.get<string>('PAYTM_INDUSTRY_TYPE') || 'Retail',
          channelId: this.configService.get<string>('PAYTM_CHANNEL_ID') || 'WEB',
          apiBaseUrl: this.configService.get<string>('PAYTM_API_URL') || 'https://securegw-stage.paytm.in',
          callbackUrl: this.configService.get<string>('PAYTM_CALLBACK_URL'),
          verifySignature: true
        };
        
      case 'bharatpe':
        return {
          merchantId: this.configService.get<string>('BHARATPE_MERCHANT_ID'),
          apiKey: this.configService.get<string>('BHARATPE_API_KEY'),
          apiSecret: this.configService.get<string>('BHARATPE_API_SECRET'),
          apiBaseUrl: this.configService.get<string>('BHARATPE_API_URL') || 'https://api.bharatpe.in',
          callbackUrl: this.configService.get<string>('BHARATPE_CALLBACK_URL'),
          verifySignature: true
        };
        
      default:
        // Generic UPI configuration (for direct UPI)
        return {
          virtualPaymentAddress: this.configService.get<string>('UPI_VPA') || `${this.configService.get<string>('UPI_MERCHANT_ID')}@upi`,
          merchantName: this.configService.get<string>('UPI_MERCHANT_NAME') || 'Your Store',
          callbackUrl: this.configService.get<string>('UPI_CALLBACK_URL'),
          verifySignature: false
        };
    }
  }

  /**
   * Create PhonePe payment intent
   */
  private async createPhonePeIntent(
    dto: CreatePaymentIntentDto, 
    transactionId: string, 
    config: Record<string, any>
  ): Promise<Record<string, any>> {
    const merchantTransactionId = transactionId;
    const callbackUrl = config.callbackUrl || 'https://yourdomain.com/payments/callback';
    const redirectUrl = dto.metadata?.redirectUrl || callbackUrl;
    
    const payload = {
      merchantId: config.merchantId,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: `MUID_${Date.now()}`,
      amount: Math.round(dto.amount * 100),
      redirectUrl: redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: callbackUrl,
      mobileNumber: dto.metadata?.mobileNumber,
      paymentInstrument: {
        type: "UPI_INTENT",
        targetApp: dto.metadata?.upiApp || "NONE"
      }
    };
    
    // In production, you would make a real API call to PhonePe
    // const response = await axios.post(`${config.apiBaseUrl}/v3/upi/pay`, payload, {
    //   headers: { 'Content-Type': 'application/json', 'X-VERIFY': generateSignature(payload, config) }
    // });
    
    // For now, generate a QR code and deep link
    const upiUrl = `upi://pay?pa=${config.merchantId}@ybl&pn=${encodeURIComponent(config.merchantName)}&tr=${merchantTransactionId}&am=${dto.amount}&cu=${dto.currency}&tn=${encodeURIComponent(`Order-${dto.orderId}`)}`;
    
    return {
      virtualPaymentAddress: `${config.merchantId}@ybl`,
      upiUrl: upiUrl,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`,
      merchantTransactionId: merchantTransactionId,
      callbackUrl: callbackUrl,
      redirectUrl: redirectUrl
    };
  }
  
  /**
   * Create Google Pay payment intent
   */
  private async createGooglePayIntent(
    dto: CreatePaymentIntentDto, 
    transactionId: string, 
    config: Record<string, any>
  ): Promise<Record<string, any>> {
    const merchantTransactionId = transactionId;
    const callbackUrl = config.callbackUrl || 'https://yourdomain.com/payments/callback';
    
    // For Google Pay, we typically use their JavaScript API on frontend
    // Here we just return the transaction details needed for that integration
    
    return {
      virtualPaymentAddress: `${config.merchantId}@okicici`,
      merchantName: config.merchantName,
      merchantTransactionId: merchantTransactionId,
      callbackUrl: callbackUrl,
      integrationMethod: 'GOOGLE_PAY_JS_API'
    };
  }
  
  /**
   * Create Paytm payment intent
   */
  private async createPaytmIntent(
    dto: CreatePaymentIntentDto, 
    transactionId: string, 
    config: Record<string, any>
  ): Promise<Record<string, any>> {
    const orderId = `ORDER_${transactionId}`;
    const callbackUrl = config.callbackUrl || 'https://yourdomain.com/payments/callback';
    
    const paytmParams = {
      MID: config.merchantId,
      ORDER_ID: orderId,
      CUST_ID: `CUST_${Date.now()}`,
      TXN_AMOUNT: dto.amount.toString(),
      CHANNEL_ID: config.channelId,
      WEBSITE: config.website,
      INDUSTRY_TYPE_ID: config.industryType,
      CALLBACK_URL: callbackUrl
    };
    
    // In production, you would:
    // 1. Generate checksum
    // 2. Make API call to Paytm
    // 3. Return the payment URL and params
    
    // For now, return the necessary values for frontend
    return {
      merchantId: config.merchantId,
      orderId: orderId,
      txnToken: `TXN_TOKEN_${Date.now()}`,
      callbackUrl: callbackUrl,
      paytmHostUrl: config.apiBaseUrl
    };
  }
  
  /**
   * Create BharatPe payment intent
   */
  private async createBharatPeIntent(
    dto: CreatePaymentIntentDto, 
    transactionId: string, 
    config: Record<string, any>
  ): Promise<Record<string, any>> {
    const merchantOrderId = `ORDER_${transactionId}`;
    const callbackUrl = config.callbackUrl || 'https://yourdomain.com/payments/callback';
    
    const payload = {
      merchantId: config.merchantId,
      merchantOrderId: merchantOrderId,
      amount: dto.amount,
      userContact: dto.metadata?.mobileNumber || '',
      txnNote: `Payment for order ${dto.orderId}`,
      callbackUrl: callbackUrl
    };
    
    // In production, you would make a real API call to BharatPe
    // For now, generate a QR code and response
    
    const upiUrl = `upi://pay?pa=${config.merchantId}@bharatpe&pn=${encodeURIComponent(config.merchantName)}&tr=${merchantOrderId}&am=${dto.amount}&cu=${dto.currency}`;
    
    return {
      virtualPaymentAddress: `${config.merchantId}@bharatpe`,
      upiUrl: upiUrl,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`,
      merchantOrderId: merchantOrderId,
      callbackUrl: callbackUrl
    };
  }
  
  /**
   * Create generic UPI intent
   */
  private createGenericUpiIntent(
    dto: CreatePaymentIntentDto, 
    transactionId: string, 
    config: Record<string, any>
  ): Promise<Record<string, any>> | Record<string, any> {
    const upiUrl = `upi://pay?pa=${config.virtualPaymentAddress}&pn=${encodeURIComponent(config.merchantName)}&tr=${transactionId}&am=${dto.amount}&cu=${dto.currency}&tn=${encodeURIComponent(`Order-${dto.orderId}`)}`;
    
    return {
      virtualPaymentAddress: config.virtualPaymentAddress,
      upiUrl: upiUrl,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`,
      transactionId: transactionId,
    };
  }
  
  /**
   * Verify PhonePe payment status
   */
  private async verifyPhonePePayment(
    payment: any, 
    providerPaymentId: string, 
    config: Record<string, any>
  ): Promise<any> {
    // In production, you would call PhonePe API to check status
    // const response = await axios.get(
    //   `${config.apiBaseUrl}/v3/transaction/${providerPaymentId}/status`,
    //   { headers: { 'X-VERIFY': this.generatePhonePeSignature(...) } }
    // );
    // return response.data;
    
    // For now, return a mock successful response
    return {
      success: true,
      code: 'PAYMENT_SUCCESS',
      status: 'SUCCESS',
      transactionId: providerPaymentId
    };
  }
  
  /**
   * Verify Google Pay payment status
   */
  private async verifyGooglePayPayment(
    payment: any, 
    providerPaymentId: string, 
    config: Record<string, any>
  ): Promise<any> {
    // Google Pay doesn't typically have a direct server API for status checks
    // Instead, it relies on webhooks for status updates
    
    // For now, return a mock successful response
    return {
      success: true,
      status: 'COMPLETED',
      transactionId: providerPaymentId
    };
  }
  
  /**
   * Verify Paytm payment status
   */
  private async verifyPaytmPayment(
    payment: any, 
    providerPaymentId: string, 
    config: Record<string, any>
  ): Promise<any> {
    // In production, you would call Paytm API to check status
    // const payload = {
    //   MID: config.merchantId,
    //   ORDERID: payment.metadata?.orderId || payment.orderId
    // };
    // Add checksum to payload
    // const response = await axios.post(
    //   `${config.apiBaseUrl}/order/status`,
    //   payload
    // );
    // return response.data;
    
    // For now, return a mock successful response
    return {
      TXNID: providerPaymentId,
      STATUS: 'TXN_SUCCESS',
      RESPCODE: '01',
      RESPMSG: 'Txn Success'
    };
  }
  
  /**
   * Verify BharatPe payment status
   */
  private async verifyBharatPePayment(
    payment: any, 
    providerPaymentId: string, 
    config: Record<string, any>
  ): Promise<any> {
    // In production, you would call BharatPe API to check status
    // const response = await axios.get(
    //   `${config.apiBaseUrl}/v1/transactions/${providerPaymentId}`,
    //   { headers: { Authorization: `Bearer ${this.getBharatPeToken(config)}` } }
    // );
    // return response.data;
    
    // For now, return a mock successful response
    return {
      status: 'SUCCESS',
      txnId: providerPaymentId,
      amount: payment.amount
    };
  }
  
  /**
   * Refund PhonePe payment
   */
  private async refundPhonePePayment(
    payment: any, 
    amount: number, 
    refundId: string, 
    config: Record<string, any>
  ): Promise<any> {
    // In production, you would call PhonePe API to refund
    // const payload = {
    //   merchantId: config.merchantId,
    //   merchantTransactionId: payment.providerPaymentId,
    //   originalTransactionId: payment.metadata?.transactionId || payment.providerPaymentId,
    //   amount: amount * 100, // Convert to paisa
    //   merchantOrderId: refundId
    // };
    // const response = await axios.post(
    //   `${config.apiBaseUrl}/v3/upi/refund`,
    //   payload,
    //   { headers: { 'X-VERIFY': this.generatePhonePeSignature(...) } }
    // );
    // return response.data;
    
    // For now, return a mock successful response
    return {
      success: true,
      code: 'PAYMENT_SUCCESS',
      status: 'SUCCESS',
      refundId: refundId
    };
  }
  
  /**
   * Refund Paytm payment
   */
  private async refundPaytmPayment(
    payment: any, 
    amount: number, 
    refundId: string, 
    config: Record<string, any>
  ): Promise<any> {
    // In production, you would call Paytm API to refund
    // const payload = {
    //   MID: config.merchantId,
    //   TXNID: payment.providerPaymentId,
    //   ORDERID: payment.metadata?.orderId || payment.orderId,
    //   REFID: refundId,
    //   REFUNDAMOUNT: amount.toString()
    // };
    // Add checksum to payload
    // const response = await axios.post(
    //   `${config.apiBaseUrl}/refund/apply`,
    //   payload
    // );
    // return response.data;
    
    // For now, return a mock successful response
    return {
      TXNID: payment.providerPaymentId,
      REFUNDID: refundId,
      STATUS: 'TXN_SUCCESS',
      RESPCODE: '01',
      RESPMSG: 'Refund Success'
    };
  }
  
  /**
   * Verify UPI signature
   * Implementation varies by provider
   */
  private async verifyUpiSignature(
    paymentId: string, 
    signature: string, 
    config: Record<string, any>
  ): Promise<boolean> {
    // Actual implementation depends on the provider
    // For now, return true to allow testing
    return true;
  }
} 