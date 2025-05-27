import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigExceptionFilter } from './filters/config-exception.filter';
import { ErrorCode } from './common/constants/error-codes.enum';
import { BadRequestException } from './common/exceptions/http-exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  try {
    // Handle config errors during startup
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
    });
    
    // Use Winston for logging
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
    
    // Get the Winston logger
    const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
    
    // Apply config exception filter first
    app.useGlobalFilters(new ConfigExceptionFilter());
    
    // Get config service
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3001);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // Security settings
    app.use(helmet());
    app.enableCors({
      origin: nodeEnv === 'production' ? 'https://yourdomain.com' : true,
      credentials: true,
    });

    // Global response transformations
    // Note: TransformInterceptor and AllExceptionsFilter are provided by APP_* tokens in AppModule

    // Validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const messages = errors.map(error => {
            if (error.constraints) {
              return Object.values(error.constraints).join(', ');
            }
            return 'Invalid input';
          });
          
          // Use our custom exception
          return new BadRequestException(
            messages.join('; '),
            ErrorCode.VALIDATION_ERROR
          );
        },
      }),
    );

    // Setup Swagger documentation
    const swaggerConfig = new DocumentBuilder()
      .setTitle('E-Commerce API')
      .setDescription('API documentation for the e-commerce platform')
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('products', 'Product management endpoints')
      .addTag('categories', 'Category management endpoints')
      .addTag('orders', 'Order management endpoints')
      .addTag('carts', 'Shopping cart endpoints')
      .addBearerAuth(
        { 
          type: 'http', 
          scheme: 'bearer', 
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();
    
    // Prefix all routes with /api/v1
    app.setGlobalPrefix('api/v1');
    
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
        // Add server URL to make sure requests include the full path
        servers: [
          {
            url: '/api/v1',
            description: 'API Server with prefix',
          },
        ],
      },
    });

    await app.listen(port);
    logger.log(`Application is running on: ${await app.getUrl()} in ${nodeEnv} mode`);
    logger.log(`API Documentation available at: ${await app.getUrl()}/api/v1/docs`);
  } catch (error) {
    // Use standard logger for bootstrap failures since Winston might not be available
    console.error(`Failed to start application: ${error.message}`, error.stack);
    process.exit(1);
  }
}
bootstrap();
