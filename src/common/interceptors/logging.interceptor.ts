import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AppLogger } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext('LoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const userId = (request as any).user?.id;
    const startTime = Date.now();

    // Generate request ID for tracing
    const requestId = this.generateRequestId();
    request['requestId'] = requestId;

    // Log incoming request
    this.logger.log({
      message: 'Incoming Request',
      requestId,
      method,
      url,
      ip,
      userAgent,
      userId,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // Log successful response
        this.logger.log({
          message: 'Request Completed',
          requestId,
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          responseSize: JSON.stringify(data).length,
          userId,
          timestamp: new Date().toISOString(),
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log error response
        this.logger.error({
          message: 'Request Failed',
          requestId,
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack,
          userId,
          timestamp: new Date().toISOString(),
        });

        throw error;
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
