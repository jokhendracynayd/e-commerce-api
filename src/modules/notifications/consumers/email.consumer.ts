import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailJob } from '../interfaces/notification.interface';

@Processor('email')
export class EmailConsumer {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(private readonly mailerService: MailerService) {}

  @Process()
  async processEmailJob(job: Job<EmailJob>) {
    this.logger.log(`Processing email job ${job.id} : ${job.data.subject} to ${job.data.to}`);
    
    try {
      const result = await this.mailerService.sendMail({
        to: job.data.to,
        subject: job.data.subject,
        template: job.data.template,
        context: job.data.context,
        cc: job.data.cc,
        bcc: job.data.bcc,
        attachments: job.data.attachments,
      });
      
      this.logger.log(`Email job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process email job ${job.id}: ${error.message}`,
        error.stack,
      );
      
      // Rethrow the error to trigger the retry mechanism
      throw error;
    }
  }
} 