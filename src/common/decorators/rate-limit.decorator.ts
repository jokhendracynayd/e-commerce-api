import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiResponse } from '@nestjs/swagger';

/**
 * Adds rate limit documentation to a controller method
 * @returns Decorators for rate limiting API documentation
 */
export function RateLimited() {
  return applyDecorators(
    ApiHeader({
      name: 'X-RateLimit-Limit',
      description: 'Request limit per minute',
      required: false,
    }),
    ApiHeader({
      name: 'X-RateLimit-Remaining',
      description: 'The number of requests left for the time window',
      required: false,
    }),
    ApiHeader({
      name: 'Retry-After',
      description:
        'How many seconds to wait before retrying when rate limit is exceeded',
      required: false,
    }),
    ApiResponse({
      status: 429,
      description:
        'Too Many Requests - Rate limit exceeded. Please try again later.',
    }),
  );
}
