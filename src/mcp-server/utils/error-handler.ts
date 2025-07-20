import { Logger } from '@nestjs/common';
import { MCPToolResult } from '../types/api-types';

export enum MCPErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
}

export interface MCPError {
  code: MCPErrorCode;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export class MCPErrorHandler {
  private readonly logger = new Logger(MCPErrorHandler.name);

  /**
   * Create a standardized error response
   */
  createErrorResponse(
    code: MCPErrorCode,
    message: string,
    details?: any,
    requestId?: string
  ): MCPToolResult {
    const error: MCPError = {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    };

    this.logger.error('MCP Error created', error);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            code: error.code,
            message: error.message,
            timestamp: error.timestamp,
            ...(error.details && { details: error.details }),
            ...(error.requestId && { requestId: error.requestId }),
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(message = 'Authentication failed', details?: any): MCPToolResult {
    return this.createErrorResponse(
      MCPErrorCode.AUTHENTICATION_FAILED,
      message,
      details
    );
  }

  /**
   * Handle rate limiting errors
   */
  handleRateLimitError(resetTime: number, details?: any): MCPToolResult {
    return this.createErrorResponse(
      MCPErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.',
      {
        resetTime,
        resetIn: Math.ceil((resetTime - Date.now()) / 1000),
        ...details,
      }
    );
  }

  /**
   * Handle tool not found errors
   */
  handleToolNotFound(toolName: string): MCPToolResult {
    return this.createErrorResponse(
      MCPErrorCode.TOOL_NOT_FOUND,
      `Tool '${toolName}' is not available`,
      { toolName, availableTools: this.getAvailableTools() }
    );
  }

  /**
   * Handle parameter validation errors
   */
  handleInvalidParameters(errors: any[], toolName?: string): MCPToolResult {
    return this.createErrorResponse(
      MCPErrorCode.INVALID_PARAMETERS,
      'Invalid parameters provided',
      { errors, toolName }
    );
  }

  /**
   * Handle API unavailable errors
   */
  handleApiUnavailable(message = 'Backend API is currently unavailable'): MCPToolResult {
    return this.createErrorResponse(
      MCPErrorCode.API_UNAVAILABLE,
      message
    );
  }

  /**
   * Handle permission denied errors
   */
  handlePermissionDenied(requiredPermission?: string): MCPToolResult {
    return this.createErrorResponse(
      MCPErrorCode.PERMISSION_DENIED,
      'Insufficient permissions to perform this action',
      { requiredPermission }
    );
  }

  /**
   * Handle resource not found errors
   */
  handleResourceNotFound(resourceType: string, resourceId: string): MCPToolResult {
    return this.createErrorResponse(
      MCPErrorCode.RESOURCE_NOT_FOUND,
      `${resourceType} with ID '${resourceId}' not found`,
      { resourceType, resourceId }
    );
  }

  /**
   * Handle unexpected errors
   */
  handleUnexpectedError(error: Error, toolName?: string, requestId?: string): MCPToolResult {
    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    const message = isProduction 
      ? 'An unexpected error occurred' 
      : error.message;

    return this.createErrorResponse(
      MCPErrorCode.INTERNAL_ERROR,
      message,
      isProduction ? undefined : {
        stack: error.stack,
        toolName,
      },
      requestId
    );
  }

  /**
   * Create success response
   */
  createSuccessResponse(data: any, message?: string): MCPToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data,
            message,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
      isError: false,
    };
  }

  /**
   * Validate tool parameters
   */
  validateParameters(params: any, schema: any): {
    isValid: boolean;
    errors: any[];
  } {
    const errors: any[] = [];
    
    // Basic validation (you can enhance this with a proper schema validator)
    if (schema.required) {
      for (const field of schema.required) {
        if (params[field] === undefined || params[field] === null) {
          errors.push({
            field,
            message: `Required parameter '${field}' is missing`,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private getAvailableTools(): string[] {
    // This would typically come from a registry or configuration
    return [
      'search_products',
      'get_product_details',
      'get_featured_products',
      'get_products_by_category',
      'get_products_by_brand',
    ];
  }
} 