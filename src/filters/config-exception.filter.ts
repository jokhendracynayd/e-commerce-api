import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCode } from '../common/constants/error-codes.enum';

@Catch(Error)
export class ConfigExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ConfigExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    // Check if it's a configuration error
    if (exception.message.includes('Config validation error')) {
      this.logger.error(`Configuration error: ${exception.message}`);
      
      // Extract the specific missing variables from the error message
      const missingVars = exception.message
        .replace('Config validation error: ', '')
        .split('. ')
        .map(msg => msg.trim());
      
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: ErrorCode.CONFIGURATION_ERROR,
        message: 'Application configuration error',
        details: missingVars,
        timestamp: new Date().toISOString(),
        path: '/',
      });
    } else {
      // Let other exception filters handle non-config errors
      throw exception;
    }
  }
} 