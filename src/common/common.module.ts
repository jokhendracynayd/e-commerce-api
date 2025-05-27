import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggerModule } from '../config/logger.module';
import { AppLogger } from './services/logger.service';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { DatabaseModule } from './database.module';

@Module({
  imports: [
    LoggerModule,
    DatabaseModule,
  ],
  providers: [AppLogger],
  exports: [AppLogger, DatabaseModule],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply logger middleware to all routes
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
} 