import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ErrorCode } from '../common/constants/error-codes.enum';
import { AppLogger } from '../common/services/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let errorDetails: any = {};

    // NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      // Handle custom exceptions with errorCode
      if (
        typeof errorResponse === 'object' &&
        'errorCode' in errorResponse &&
        'message' in errorResponse
      ) {
        errorCode = errorResponse.errorCode as ErrorCode;
        message = errorResponse.message as string;

        // Extract any additional details
        errorDetails = { ...errorResponse };
        delete errorDetails.errorCode;
        delete errorDetails.message;
      } else {
        // Standard NestJS exceptions
        message =
          typeof errorResponse === 'object' && 'message' in errorResponse
            ? Array.isArray(errorResponse.message)
              ? errorResponse.message[0]
              : errorResponse.message
            : exception.message;

        // Determine error code based on status
        errorCode = this.getErrorCodeFromStatus(status);
      }
    }
    // Prisma errors
    else if (exception instanceof PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
      errorCode = prismaError.code;
      errorDetails = { prismaError: exception.code, meta: exception.meta };
    }
    // Unknown exceptions
    else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack:
          process.env.NODE_ENV === 'development' ? exception.stack : undefined,
      };
    }

    // Log the error with context
    this.logger.error({
      message: `${request.method} ${request.url} - Status ${status} - ${message}`,
      exception: exception instanceof Error ? exception.name : 'UnknownError',
      errorCode,
      path: request.url,
      method: request.method,
      body: request.body,
      query: request.query,
      params: request.params,
      statusCode: status,
      stack: exception instanceof Error ? exception.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Return standardized error response
    response.status(status).json({
      statusCode: status,
      errorCode: errorCode,
      message: message,
      details: Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getErrorCodeFromStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.UNPROCESSABLE_ENTITY;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.TOO_MANY_REQUESTS;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.INTERNAL_SERVER_ERROR;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): {
    status: number;
    message: string;
    code: ErrorCode;
  } {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: `Unique constraint violation: ${error.meta?.target}`,
          code: ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
        };
      case 'P2025': // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          code: ErrorCode.RECORD_NOT_FOUND,
        };
      case 'P2003': // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint violation',
          code: ErrorCode.FOREIGN_KEY_CONSTRAINT_VIOLATION,
        };
      case 'P2001': // Record not found for where condition
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          code: ErrorCode.RECORD_NOT_FOUND,
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Database error: ${error.message}`,
          code: ErrorCode.DATABASE_ERROR,
        };
    }
  }
}
