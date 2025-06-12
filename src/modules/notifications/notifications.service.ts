import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { NotificationType } from './interfaces/notification.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Send a notification to a user
   * @param type The notification type
   * @param userId The user ID
   * @param data The data to include in the notification
   */
  async sendNotification(
    type: NotificationType,
    userId: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.log(
      `Sending notification of type ${type} to user ${userId}`,
    );

    try {
      switch (type) {
        case NotificationType.WELCOME:
          await this.emailService.sendWelcomeEmail(userId, data);
          break;
        case NotificationType.ORDER_CONFIRMATION:
          await this.emailService.sendOrderConfirmation(userId, data);
          break;
        case NotificationType.ORDER_SHIPPED:
          await this.emailService.sendOrderShipped(userId, data);
          break;
        case NotificationType.ORDER_DELIVERED:
          await this.emailService.sendOrderDelivered(userId, data);
          break;
        case NotificationType.PASSWORD_RESET:
          await this.emailService.sendPasswordReset(userId, data);
          break;
        case NotificationType.EMAIL_VERIFICATION:
          await this.emailService.sendEmailVerification(userId, data);
          break;
        case NotificationType.PROMOTION:
          await this.emailService.sendPromotionEmail(userId, data);
          break;
        case NotificationType.LOW_STOCK_ALERT:
          await this.emailService.sendLowStockAlert(data);
          break;
        default:
          this.logger.warn(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification of type ${type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
} 