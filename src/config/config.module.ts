import { Module, Logger } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import s3Config from './s3.config';

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
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().default('1d'),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        // AWS S3 Configuration validation
        AWS_REGION: Joi.string().required(),
        AWS_ACCESS_KEY_ID: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        AWS_S3_BUCKET: Joi.string().required(),
        AWS_S3_URL: Joi.string().optional(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
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
    });
  }
}
