import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma.service';
import { EmailOptions, EmailJob } from '../interfaces/notification.interface';
import { TemplateService } from './template.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly retryAttempts: number = 3;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly templateService: TemplateService,
    @InjectQueue('email') private readonly emailQueue: Queue<EmailJob>,
  ) {}

  /**
   * Add an email to the queue for processing
   * @param options Email options
   */
  async queueEmail(options: EmailOptions): Promise<void> {
    try {
      await this.emailQueue.add(
        {
          to: options.to,
          subject: options.subject,
          template: options.template,
          context: options.context,
          cc: options.cc,
          bcc: options.bcc,
          attachments: options.attachments,
        },
        {
          attempts: this.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
        },
      );
      this.logger.log(
        `Email queued successfully: ${options.subject} to ${options.to}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue email to ${options.to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send an email directly (bypassing the queue)
   * @param options Email options
   * @returns
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        template: options.template,
        context: options.context,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      });
      this.logger.log(
        `Email sent successfully: ${options.subject} to ${options.to}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get a user's email from their ID
   * @param userId User ID
   * @returns User's email
   */
  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      return user.email;
    } catch (error) {
      this.logger.error(
        `Failed to get user email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send welcome email to a new user
   * @param userId User ID
   * @param data Additional data
   */
  async sendWelcomeEmail(userId: string, data: any): Promise<void> {
    try {
      const email = await this.getUserEmail(userId);
      const userName = data.firstName || 'Valued Customer';

      await this.queueEmail({
        to: email,
        subject: 'Welcome to Our E-Commerce Store!',
        template: 'welcome',
        context: {
          name: userName,
          loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
          ...data,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send order confirmation email
   * @param userId User ID
   * @param data Order data
   */
  async sendOrderConfirmation(userId: string, data: any): Promise<void> {
    try {
      const email = await this.getUserEmail(userId);
      const userName = data.firstName || 'Valued Customer';

      // Format order items for the email
      const formattedItems = data.items?.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: this.formatPrice(item.price),
        total: this.formatPrice(item.price * item.quantity),
      }));

      await this.queueEmail({
        to: email,
        subject: `Order Confirmed #${data.orderNumber}`,
        template: 'order-confirmation',
        context: {
          name: userName,
          orderNumber: data.orderNumber,
          orderDate: new Date(data.createdAt).toLocaleDateString(),
          shippingAddress: this.formatAddress(data.shippingAddress),
          items: formattedItems,
          subtotal: this.formatPrice(data.subtotal),
          shipping: this.formatPrice(data.shipping),
          tax: this.formatPrice(data.tax),
          total: this.formatPrice(data.total),
          orderUrl: `${this.configService.get('FRONTEND_URL')}/orders/${data.orderId}`,
          ...data,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send order shipped email
   * @param userId User ID
   * @param data Shipping data
   */
  async sendOrderShipped(userId: string, data: any): Promise<void> {
    try {
      const email = await this.getUserEmail(userId);
      const userName = data.firstName || 'Valued Customer';

      await this.queueEmail({
        to: email,
        subject: `Your Order #${data.orderNumber} Has Been Shipped!`,
        template: 'order-shipped',
        context: {
          name: userName,
          orderNumber: data.orderNumber,
          trackingNumber: data.trackingNumber,
          trackingUrl: data.trackingUrl,
          estimatedDelivery: data.estimatedDelivery,
          shippingAddress: this.formatAddress(data.shippingAddress),
          orderUrl: `${this.configService.get('FRONTEND_URL')}/orders/${data.orderId}`,
          ...data,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send order shipped email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send order delivered email
   * @param userId User ID
   * @param data Delivery data
   */
  async sendOrderDelivered(userId: string, data: any): Promise<void> {
    try {
      const email = await this.getUserEmail(userId);
      const userName = data.firstName || 'Valued Customer';

      await this.queueEmail({
        to: email,
        subject: `Your Order #${data.orderNumber} Has Been Delivered!`,
        template: 'order-delivered',
        context: {
          name: userName,
          orderNumber: data.orderNumber,
          deliveryDate: new Date().toLocaleDateString(),
          reviewUrl: `${this.configService.get('FRONTEND_URL')}/orders/${data.orderId}/review`,
          ...data,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send order delivered email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param userId User ID
   * @param data Reset token data
   */
  async sendPasswordReset(userId: string, data: any): Promise<void> {
    try {
      const email = await this.getUserEmail(userId);

      await this.queueEmail({
        to: email,
        subject: 'Reset Your Password',
        template: 'password-reset',
        context: {
          resetLink: `${this.configService.get('FRONTEND_URL')}/reset-password?token=${data.resetToken}`,
          expiryTime: '30 minutes',
          ...data,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send email verification
   * @param userId User ID
   * @param data Verification data
   */
  async sendEmailVerification(userId: string, data: any): Promise<void> {
    try {
      const email = await this.getUserEmail(userId);

      await this.queueEmail({
        to: email,
        subject: 'Verify Your Email Address',
        template: 'email-verification',
        context: {
          verificationLink: `${this.configService.get('FRONTEND_URL')}/verify-email?token=${data.verificationToken}`,
          expiryTime: '24 hours',
          ...data,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email verification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send promotion email
   * @param userId User ID
   * @param data Promotion data
   */
  async sendPromotionEmail(userId: string, data: any): Promise<void> {
    try {
      const email = await this.getUserEmail(userId);
      const userName = data.firstName || 'Valued Customer';

      await this.queueEmail({
        to: email,
        subject: data.subject || 'Special Offer Just For You!',
        template: 'promotion',
        context: {
          name: userName,
          promotionUrl: `${this.configService.get('FRONTEND_URL')}/promotions/${data.promotionId}`,
          ...data,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send promotion email: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send low stock alert to administrators
   * @param data Product data
   */
  async sendLowStockAlert(data: any): Promise<void> {
    try {
      // Get admin emails or a specific stock notification email
      const adminEmail = this.configService.get(
        'ADMIN_EMAIL',
        'admin@example.com',
      );

      await this.queueEmail({
        to: adminEmail,
        subject: `Low Stock Alert: ${data.productName}`,
        template: 'low-stock-alert',
        context: {
          productName: data.productName,
          productId: data.productId,
          sku: data.sku,
          currentStock: data.currentStock,
          threshold: data.threshold,
          restockUrl: `${this.configService.get('ADMIN_URL')}/products/${data.productId}/edit`,
          ...data,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send low stock alert: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Format an address for display in emails
   * @param address Address object
   * @returns Formatted address string
   */
  private formatAddress(address: any): string {
    if (!address) return 'Address not provided';

    return `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, 
            ${address.city}, ${address.state} ${address.postalCode}, 
            ${address.country}`;
  }

  /**
   * Format a price for display in emails
   * @param amount Price amount
   * @param currency Currency code
   * @returns Formatted price string
   */
  private formatPrice(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}
