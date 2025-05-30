import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggerModule } from '../config/logger.module';
import { AppLogger } from './services/logger.service';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { DatabaseModule } from './database.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [LoggerModule, DatabaseModule],
  providers: [
    AppLogger,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AppLogger, DatabaseModule],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply logger middleware to all routes
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
