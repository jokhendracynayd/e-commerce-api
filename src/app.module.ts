import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { MemoryCacheModule } from './config/memory-cache.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { BrandsModule } from './modules/brands/brands.module';
import { TagsModule } from './modules/tags/tags.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CartsModule } from './modules/carts/carts.module';
import { UsersModule } from './modules/users/users.module';
import { DealsModule } from './modules/deals/deals.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { SpecificationsModule } from './modules/specifications/specifications.module';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { AppLogger } from './common/services/logger.service';

@Module({
  imports: [
    ConfigModule,
    MemoryCacheModule,
    CommonModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    TagsModule,
    UploadsModule,
    InventoryModule,
    OrdersModule,
    CartsModule,
    UsersModule,
    DealsModule,
    CouponsModule,
    SpecificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useFactory: (logger: AppLogger) => {
        return new AllExceptionsFilter(logger);
      },
      inject: [AppLogger],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
