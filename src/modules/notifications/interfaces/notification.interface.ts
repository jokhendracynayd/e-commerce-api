export enum NotificationType {
  WELCOME = 'WELCOME',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PROMOTION = 'PROMOTION',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
}

export interface EmailOptions {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  attachments?: any[];
}

export interface TemplateData {
  [key: string]: any;
}

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
} 