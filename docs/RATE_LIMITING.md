# Rate Limiting Implementation

This document describes the rate limiting implementation in the e-commerce API.

## Overview

Rate limiting is implemented to protect the API from abuse and to ensure fair usage of resources. The implementation uses NestJS's built-in `@nestjs/throttler` package to provide rate limiting capabilities.

## Configuration

Rate limiting is configured in the `RateLimitModule` with the following default settings:

- **Global Rate Limit**: 10 requests per minute for all endpoints
- **Payment-specific Rate Limit**: 5 requests per minute for payment operations

These settings can be customized through environment variables:

```env
# Global rate limit settings
THROTTLE_TTL=60       # Time window in seconds
THROTTLE_LIMIT=10     # Number of requests allowed in the time window

# Payment-specific rate limit settings
PAYMENT_THROTTLE_TTL=60    # Time window in seconds
PAYMENT_THROTTLE_LIMIT=5   # Number of requests allowed in the time window
```

## Headers

When rate limiting is applied, the following headers are included in the response:

- `X-RateLimit-Limit`: The maximum number of requests allowed in the current time window
- `X-RateLimit-Remaining`: The number of requests remaining in the current time window
- `Retry-After`: The number of seconds to wait before making another request (only present when rate limit is exceeded)

## Exceeded Rate Limit

When a client exceeds the rate limit, the API will respond with:

- Status Code: `429 Too Many Requests`
- Response Body: `{"statusCode":429,"message":"ThrottlerException: Rate limit exceeded"}`

## Implementation Details

### Rate Limit Module

The rate limiting configuration is defined in `src/config/rate-limit.module.ts`. This module configures the global and payment-specific rate limits.

### Payment Throttler Guard

A custom guard (`PaymentThrottlerGuard`) is applied to the payments controller to enforce stricter rate limits for payment operations.

### API Documentation

Rate limiting information is included in the Swagger documentation through:

1. The `@RateLimited()` decorator, which adds headers and response documentation
2. Controller-level documentation showing rate limiting headers

## Best Practices for Clients

Clients should:

1. Respect the rate limit headers and back off when necessary
2. Implement exponential backoff when receiving 429 responses
3. Cache responses when appropriate to reduce the number of API calls
4. Use idempotency keys for payment operations to avoid duplicate requests

## Monitoring and Adjustments

Rate limits are monitored and may be adjusted based on:

- API usage patterns
- Server load
- Security considerations

For questions or concerns about rate limiting, please contact the API team. 