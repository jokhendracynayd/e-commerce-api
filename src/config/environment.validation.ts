import * as Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  API_PREFIX: Joi.string().default('api/v1'),

  // Database Configuration
  DATABASE_URL: Joi.string().required(),
  DATABASE_URL_TEST: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),

  // Authentication Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),

  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.number().default(0),

  // AWS S3 Configuration
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET: Joi.string().required(),
  AWS_S3_URL: Joi.string().uri().optional(),

  // Payment Provider Configuration
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  UPI_API_KEY: Joi.string().optional(),
  UPI_MERCHANT_ID: Joi.string().optional(),

  // Email Configuration
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_USER: Joi.string().email().optional(),
  SMTP_PASS: Joi.string().optional(),
  FROM_EMAIL: Joi.string().email().optional(),

  // Rate Limiting Configuration
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),
  PAYMENT_RATE_LIMIT_TTL: Joi.number().default(60),
  PAYMENT_RATE_LIMIT_MAX: Joi.number().default(5),

  // Logging Configuration
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_FILE_PATH: Joi.string().default('./logs'),

  // CORS Configuration
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  ADMIN_URL: Joi.string().uri().optional(),
  FRONTEND_URL: Joi.string().uri().optional(),

  // Search Configuration
  ELASTICSEARCH_NODE: Joi.string().uri().optional(),
  ELASTICSEARCH_USERNAME: Joi.string().optional().allow(''),
  ELASTICSEARCH_PASSWORD: Joi.string().optional().allow(''),

  // File Upload Configuration
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/webp'),

  // Security Configuration
  CSRF_SECRET: Joi.string().min(32).optional(),
  COOKIE_SECRET: Joi.string().min(32).optional(),

  // External API Configuration
  PAYMENT_GATEWAY_TIMEOUT: Joi.number().default(30000),
  EXTERNAL_API_TIMEOUT: Joi.number().default(10000),

  // Notification Configuration
  NOTIFICATION_QUEUE_CONCURRENCY: Joi.number().default(5),
  EMAIL_QUEUE_CONCURRENCY: Joi.number().default(10),
});

export const validationOptions = {
  allowUnknown: true,
  abortEarly: false,
  stripUnknown: true,
};
