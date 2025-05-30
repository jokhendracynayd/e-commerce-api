import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';

    // Log the request when it starts
    this.logger.log(`${method} ${originalUrl} - ${ip} - ${userAgent}`);

    // Get timestamp before processing
    const startTime = Date.now();

    // Process the request
    response.on('finish', () => {
      // Log after the request is processed
      const { statusCode } = response;
      const contentLength = response.get('content-length') || 0;
      const processingTime = Date.now() - startTime;

      // Set different log levels based on status code
      const logMessage = `${method} ${originalUrl} ${statusCode} ${contentLength} - ${processingTime}ms`;

      if (statusCode >= 500) {
        this.logger.error(logMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
