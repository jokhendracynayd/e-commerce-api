import { Logger } from '@nestjs/common';
import { MCPError, MCPToolResult } from '../types/api-types';

export class MCPErrorHandler {
  private static readonly logger = new Logger(MCPErrorHandler.name);

  /**
   * Create standardized error result for MCP tools
   */
  static createErrorResult(
    code: string,
    message: string,
    details?: any
  ): MCPToolResult {
    return {
      content: [
        {
          type: "text",
          text: `Error [${code}]: ${message}`
        }
      ],
      isError: true
    };
  }

  /**
   * Handle and transform various error types
   */
  static handleError(error: any, context: string): MCPToolResult {
    this.logger.error(`Error in ${context}`, error);

    // Handle different error types
    if (error.response) {
      // HTTP errors
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      switch (status) {
        case 400:
          return this.createErrorResult('BAD_REQUEST', `Invalid request: ${message}`);
        case 401:
          return this.createErrorResult('UNAUTHORIZED', 'Authentication required or invalid');
        case 403:
          return this.createErrorResult('FORBIDDEN', 'Access denied');
        case 404:
          return this.createErrorResult('NOT_FOUND', 'Resource not found');
        case 429:
          return this.createErrorResult('RATE_LIMITED', 'Too many requests, please try again later');
        case 500:
          return this.createErrorResult('SERVER_ERROR', 'Internal server error');
        default:
          return this.createErrorResult('HTTP_ERROR', `HTTP ${status}: ${message}`);
      }
    }

    if (error.code) {
      // Network or system errors
      switch (error.code) {
        case 'ECONNREFUSED':
          return this.createErrorResult('CONNECTION_REFUSED', 'Unable to connect to the service');
        case 'ETIMEDOUT':
          return this.createErrorResult('TIMEOUT', 'Request timed out');
        case 'ENOTFOUND':
          return this.createErrorResult('DNS_ERROR', 'Service not found');
        default:
          return this.createErrorResult('SYSTEM_ERROR', `System error: ${error.code}`);
      }
    }

    // Generic error
    return this.createErrorResult(
      'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred'
    );
  }

  /**
   * Validate tool arguments
   */
  static validateArguments(
    args: any,
    required: string[],
    optional: string[] = []
  ): { isValid: boolean; error?: MCPToolResult } {
    // Check required arguments
    for (const field of required) {
      if (args[field] === undefined || args[field] === null) {
        return {
          isValid: false,
          error: this.createErrorResult(
            'MISSING_ARGUMENT',
            `Required argument '${field}' is missing`
          )
        };
      }
    }

    // Check for unexpected arguments
    const allowedFields = [...required, ...optional];
    for (const field in args) {
      if (!allowedFields.includes(field)) {
        this.logger.warn(`Unexpected argument provided: ${field}`);
      }
    }

    return { isValid: true };
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(
    page?: number,
    limit?: number
  ): { isValid: boolean; error?: MCPToolResult } {
    if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
      return {
        isValid: false,
        error: this.createErrorResult(
          'INVALID_PAGINATION',
          'Page must be a positive integer'
        )
      };
    }

    if (limit !== undefined && (limit < 1 || limit > 100 || !Number.isInteger(limit))) {
      return {
        isValid: false,
        error: this.createErrorResult(
          'INVALID_PAGINATION',
          'Limit must be an integer between 1 and 100'
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Validate price range parameters
   */
  static validatePriceRange(
    minPrice?: number,
    maxPrice?: number
  ): { isValid: boolean; error?: MCPToolResult } {
    if (minPrice !== undefined && minPrice < 0) {
      return {
        isValid: false,
        error: this.createErrorResult(
          'INVALID_PRICE',
          'Minimum price cannot be negative'
        )
      };
    }

    if (maxPrice !== undefined && maxPrice < 0) {
      return {
        isValid: false,
        error: this.createErrorResult(
          'INVALID_PRICE',
          'Maximum price cannot be negative'
        )
      };
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return {
        isValid: false,
        error: this.createErrorResult(
          'INVALID_PRICE_RANGE',
          'Minimum price cannot be greater than maximum price'
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Create success result with consistent formatting
   */
  static createSuccessResult(text: string, data?: any): MCPToolResult {
    const content = [
      {
        type: "text" as const,
        text: text
      }
    ];

    if (data) {
      content.push({
        type: "text" as const,
        text: `\nDetailed data:\n${JSON.stringify(data, null, 2)}`
      });
    }

    return { content };
  }

  /**
   * Log tool execution metrics
   */
  static logToolExecution(
    toolName: string,
    executionTime: number,
    success: boolean,
    userId?: string
  ): void {
    const status = success ? 'SUCCESS' : 'FAILED';
    this.logger.log(
      `Tool: ${toolName} | Status: ${status} | Time: ${executionTime}ms | User: ${userId || 'system'}`
    );
  }
} 