import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggerModule } from '../config/logger.module';
import { AppLogger } from './services/logger.service';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { DatabaseModule } from './database.module';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [LoggerModule, DatabaseModule],
  providers: [
    AppLogger,
    RolesGuard,
  ],
  exports: [AppLogger, DatabaseModule, RolesGuard],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply logger middleware to all routes using a named parameter
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
