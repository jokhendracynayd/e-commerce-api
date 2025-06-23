import { Module, Logger } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import s3Config from './s3.config';
import {
  environmentValidationSchema,
  validationOptions,
} from './environment.validation';

const logger = new Logger('ConfigModule');

// Check if .env file exists
const envFilePath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envFilePath)) {
  logger.error(`.env file not found at ${envFilePath}`);
  process.exit(1);
}

// Load environment variables
const envConfig = dotenv.config({ path: envFilePath });
if (envConfig.error) {
  logger.error(`Error loading .env file: ${envConfig.error.message}`);
  process.exit(1);
}

// Log environment variable status
logger.log('Environment variables loaded successfully');

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      cache: true,
      load: [s3Config], // Load S3 configuration
      validationSchema: environmentValidationSchema,
      validationOptions,
    }),
  ],
})
export class ConfigModule {
  constructor() {
    // For debugging purposes
    logger.debug('Environment variables loaded:', {
      DATABASE_URL: process.env.DATABASE_URL ? '[HIDDEN]' : undefined,
      JWT_SECRET: process.env.JWT_SECRET ? '[HIDDEN]' : undefined,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      AWS_REGION: process.env.AWS_REGION,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '[HIDDEN]' : undefined,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '[HIDDEN]' : undefined,
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY
        ? '[HIDDEN]'
        : undefined,
      UPI_API_KEY: process.env.UPI_API_KEY ? '[HIDDEN]' : undefined,
      UPI_MERCHANT_ID: process.env.UPI_MERCHANT_ID,
    });
  }
}
