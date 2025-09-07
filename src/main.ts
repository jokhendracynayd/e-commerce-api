import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import { ConfigExceptionFilter } from './filters/config-exception.filter';
import { ErrorCode } from './common/constants/error-codes.enum';
import { BadRequestException } from './common/exceptions/http-exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { AppLogger } from './common/services/logger.service';
import { CategoryResponseDto } from './modules/categories/dto/category-response.dto';
import { BrandResponseDto } from './modules/brands/dto/brand-response.dto';
import { AddressDto } from './modules/users/dto/address.dto';
import { UpdateProductTagsDto } from './modules/products/dto/update-product-tags.dto';
import { ProductResponseDto } from './modules/products/dto/product-response.dto';
import {
  CouponResponseDto,
  CouponType,
  CouponStatus,
  CreateCouponDto,
  UpdateCouponDto,
  ApplyCouponDto,
  ValidateCouponDto,
  CategoryDto,
  ProductDto,
  CartItemDto,
} from './modules/coupons/dto';

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

    // Create a contextId for resolving scoped providers
    const appLoggerFactory = await app.resolve(AppLogger);
    const appLogger = appLoggerFactory.setContext('GlobalExceptionFilter');

    // Also explicitly apply AllExceptionsFilter to ensure it catches all exceptions
    // This works alongside the provider in AppModule
    app.useGlobalFilters(new AllExceptionsFilter(appLogger));

    // Get config service
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3001);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // Security settings
    app.use(helmet());

    // Add cookie parser middleware - must be before csrf
    app.use(cookieParser());

    // Configure CORS with credentials support
    const corsOrigin =
      nodeEnv === 'production'
        ? ['https://allmart.fashion', 'https://admin.allmart.fashion']
        : true;
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });

    // Global prefix will be set once at the end of setup

    // Custom middleware to handle CSRF protection for different paths
    app.use((req, res, next) => {
      const fullPath = req.originalUrl || req.url;
      const method = req.method;

      // Safe methods don't need CSRF protection
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        // For safe methods, just add the CSRF token cookie
        addCsrfTokenCookie(req, res);
        return next();
      }

      // Check for paths that should be exempt from CSRF protection
      const exemptPaths = [
        // Auth routes
        '/auth/login',
        '/auth/register',
        '/auth/refresh',
        '/auth/logout',
        '/auth/admin/login',
        '/auth/admin/register',
        '/auth/csrf-token',
        '/docs',

        // Cart operations
        '/carts/merge-anonymous',
        '/carts/add-item',
        '/carts/items/',
        '/carts/clear',
        '/carts/my-cart',

        // User operations
        '/users/me/addresses',

        // Product operations
        '/products',
        '/products/',

        // Order operations
        '/orders',
        '/orders/user-order',
        '/orders/my-orders',

        // Wishlist operations
        '/wishlist/',

        // brand operations
        '/brands',
        '/brands/',

        // Category operations
        '/categories',
        '/categories/',

        // Coupon operations
        '/coupons',
        '/coupons/',

        // Inventory operations
        '/inventory/availability/batch',
        '/inventory/availability/product',
        '/inventory/availability/variant',
        '/inventory/add',

        // review
        '/reviews',
        '/reviews/',

        // Analytics operations
        '/analytics/',

        // Deals operations
        '/deals/',

        // Uploads operations
        '/uploads/',

        // Tags operations
        '/tags',
        '/tags/',

        // User management operations
        '/users',
        '/users/',

        // Specification operations
        '/specifications',
        '/specifications/',

        // Promo banners
        '/promo-banners',
        '/promo-banners/',

        // Payment operations
        '/payments',
        '/payments/',
      ];

      // Log the path being checked (for debugging)
      // console.log(`Checking CSRF for ${method} ${fullPath}`);

      // Check if this path should be exempt from CSRF
      const shouldExempt = exemptPaths.some(
        (exemptPath) =>
          fullPath.includes(`/api/v1${exemptPath}`) ||
          fullPath.includes(exemptPath),
      );

      if (shouldExempt) {
        console.log(`Exempting path from CSRF: ${fullPath}`);
        // Skip CSRF for exempt paths but still add token cookie
        addCsrfTokenCookie(req, res);
        return next();
      }

      // For all other paths, apply CSRF protection
      console.log(`Applying CSRF protection to: ${fullPath}`);
      return csurf({
        cookie: {
          key: 'XSRF-TOKEN',
          httpOnly: false,
          sameSite: nodeEnv === 'production' ? 'strict' : 'lax',
          secure: nodeEnv === 'production',
        },
      })(req, res, next);
    });

    // Helper function to add CSRF token cookie
    function addCsrfTokenCookie(req, res) {
      // For exempt routes, set a dummy token
      // For routes with CSRF protection, the token will be set by the middleware
      if (!req.csrfToken) {
        res.cookie('XSRF-TOKEN', 'exempt-csrf-route', {
          httpOnly: false,
          sameSite: nodeEnv === 'production' ? 'strict' : 'lax',
          secure: nodeEnv === 'production',
          path: '/',
        });
      }
    }

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
          const messages = errors.map((error) => {
            if (error.constraints) {
              return Object.values(error.constraints).join(', ');
            }
            return 'Invalid input';
          });

          // Use our custom exception
          return new BadRequestException(
            messages.join('; '),
            ErrorCode.VALIDATION_ERROR,
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
      .addTag('tags', 'Tag management endpoints')
      .addTag('brands', 'Brand management endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('uploads', 'File upload endpoints')
      .addTag('analytics', 'Analytics and reporting endpoints')
      .addTag('coupons', 'Coupon management endpoints')
      .addTag('deals', 'Deals and promotions endpoints')
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

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      extraModels: [
        CategoryResponseDto,
        BrandResponseDto,
        AddressDto,
        UpdateProductTagsDto,
        ProductResponseDto,
        CouponResponseDto,
        CreateCouponDto,
        UpdateCouponDto,
        ApplyCouponDto,
        ValidateCouponDto,
        CartItemDto,
        CategoryDto,
        ProductDto,
      ],
    });
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
    logger.log(
      `Application is running on: ${await app.getUrl()} in ${nodeEnv} mode`,
    );
    logger.log(
      `API Documentation available at: ${await app.getUrl()}/api/v1/docs`,
    );
  } catch (error) {
    // Use standard logger for bootstrap failures since Winston might not be available
    console.error(`Failed to start application: ${error.message}`, error.stack);
    process.exit(1);
  }
}
bootstrap();
