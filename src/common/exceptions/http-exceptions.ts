import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.enum';

export class CustomHttpException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    errorCode: ErrorCode,
  ) {
    super(
      {
        message,
        errorCode,
      },
      status,
    );
  }
}

export class BadRequestException extends CustomHttpException {
  constructor(message = 'Bad request', errorCode = ErrorCode.BAD_REQUEST) {
    super(message, HttpStatus.BAD_REQUEST, errorCode);
  }
}

export class UnauthorizedException extends CustomHttpException {
  constructor(message = 'Unauthorized', errorCode = ErrorCode.UNAUTHORIZED) {
    super(message, HttpStatus.UNAUTHORIZED, errorCode);
  }
}

export class ForbiddenException extends CustomHttpException {
  constructor(message = 'Forbidden', errorCode = ErrorCode.FORBIDDEN) {
    super(message, HttpStatus.FORBIDDEN, errorCode);
  }
}

export class NotFoundException extends CustomHttpException {
  constructor(message = 'Resource not found', errorCode = ErrorCode.NOT_FOUND) {
    super(message, HttpStatus.NOT_FOUND, errorCode);
  }
}

export class ConflictException extends CustomHttpException {
  constructor(message = 'Conflict', errorCode = ErrorCode.CONFLICT) {
    super(message, HttpStatus.CONFLICT, errorCode);
  }
}

export class UnprocessableEntityException extends CustomHttpException {
  constructor(message = 'Unprocessable entity', errorCode = ErrorCode.UNPROCESSABLE_ENTITY) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, errorCode);
  }
}

export class TooManyRequestsException extends CustomHttpException {
  constructor(message = 'Too many requests', errorCode = ErrorCode.TOO_MANY_REQUESTS) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, errorCode);
  }
}

export class InternalServerErrorException extends CustomHttpException {
  constructor(message = 'Internal server error', errorCode = ErrorCode.INTERNAL_SERVER_ERROR) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, errorCode);
  }
} 