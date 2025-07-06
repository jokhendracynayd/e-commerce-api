import { MCPToolResult } from '../types/api-types';
import { MCPErrorHandler } from './error-handler';

export class MCPValidators {
  
  /**
   * Validate product search parameters
   */
  static validateSearchParams(args: any): { isValid: boolean; error?: MCPToolResult } {
    // Validate pagination
    const paginationValidation = MCPErrorHandler.validatePagination(args.page, args.limit);
    if (!paginationValidation.isValid) {
      return paginationValidation;
    }

    // Validate price range
    const priceValidation = MCPErrorHandler.validatePriceRange(args.minPrice, args.maxPrice);
    if (!priceValidation.isValid) {
      return priceValidation;
    }

    // Validate sort order
    if (args.sortOrder && !['asc', 'desc'].includes(args.sortOrder)) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_SORT_ORDER',
          'Sort order must be either "asc" or "desc"'
        )
      };
    }

    // Validate tags array
    if (args.tags && !Array.isArray(args.tags)) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_TAGS',
          'Tags must be an array of strings'
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Validate product details parameters
   */
  static validateProductDetailsParams(args: any): { isValid: boolean; error?: MCPToolResult } {
    // Must have either productId or slug
    if (!args.productId && !args.slug) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'MISSING_IDENTIFIER',
          'Either productId or slug must be provided'
        )
      };
    }

    // Validate productId format (if provided)
    if (args.productId && typeof args.productId !== 'string') {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_PRODUCT_ID',
          'Product ID must be a string'
        )
      };
    }

    // Validate slug format (if provided)
    if (args.slug && typeof args.slug !== 'string') {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_SLUG',
          'Slug must be a string'
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Validate category parameters
   */
  static validateCategoryParams(args: any): { isValid: boolean; error?: MCPToolResult } {
    // Validate required categorySlug
    const validation = MCPErrorHandler.validateArguments(args, ['categorySlug']);
    if (!validation.isValid) {
      return validation;
    }

    // Validate categorySlug format
    if (typeof args.categorySlug !== 'string' || args.categorySlug.trim().length === 0) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_CATEGORY_SLUG',
          'Category slug must be a non-empty string'
        )
      };
    }

    // Validate pagination
    return MCPErrorHandler.validatePagination(args.page, args.limit);
  }

  /**
   * Validate brand parameters
   */
  static validateBrandParams(args: any): { isValid: boolean; error?: MCPToolResult } {
    // Validate required brandSlug
    const validation = MCPErrorHandler.validateArguments(args, ['brandSlug']);
    if (!validation.isValid) {
      return validation;
    }

    // Validate brandSlug format
    if (typeof args.brandSlug !== 'string' || args.brandSlug.trim().length === 0) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_BRAND_SLUG',
          'Brand slug must be a non-empty string'
        )
      };
    }

    // Validate pagination
    return MCPErrorHandler.validatePagination(args.page, args.limit);
  }

  /**
   * Validate featured products parameters
   */
  static validateFeaturedParams(args: any): { isValid: boolean; error?: MCPToolResult } {
    // Validate limit
    if (args.limit !== undefined) {
      if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50) {
        return {
          isValid: false,
          error: MCPErrorHandler.createErrorResult(
            'INVALID_LIMIT',
            'Limit must be an integer between 1 and 50'
          )
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate order tracking parameters
   */
  static validateOrderParams(args: any): { isValid: boolean; error?: MCPToolResult } {
    // Must have either orderId or orderNumber
    if (!args.orderId && !args.orderNumber) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'MISSING_ORDER_IDENTIFIER',
          'Either orderId or orderNumber must be provided'
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Validate user parameters
   */
  static validateUserParams(args: any): { isValid: boolean; error?: MCPToolResult } {
    const validation = MCPErrorHandler.validateArguments(args, ['userId']);
    if (!validation.isValid) {
      return validation;
    }

    // Validate userId format
    if (typeof args.userId !== 'string' || args.userId.trim().length === 0) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_USER_ID',
          'User ID must be a non-empty string'
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Validate date range parameters
   */
  static validateDateRange(
    startDate?: string,
    endDate?: string
  ): { isValid: boolean; error?: MCPToolResult } {
    if (startDate && !this.isValidDateString(startDate)) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_START_DATE',
          'Start date must be in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
        )
      };
    }

    if (endDate && !this.isValidDateString(endDate)) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_END_DATE',
          'End date must be in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
        )
      };
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        return {
          isValid: false,
          error: MCPErrorHandler.createErrorResult(
            'INVALID_DATE_RANGE',
            'Start date cannot be after end date'
          )
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate inventory parameters
   */
  static validateInventoryParams(args: any): { isValid: boolean; error?: MCPToolResult } {
    if (args.productIds && !Array.isArray(args.productIds)) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_PRODUCT_IDS',
          'Product IDs must be an array'
        )
      };
    }

    if (args.productIds && args.productIds.length === 0) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'EMPTY_PRODUCT_IDS',
          'Product IDs array cannot be empty'
        )
      };
    }

    if (args.productIds && args.productIds.length > 100) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'TOO_MANY_PRODUCT_IDS',
          'Cannot check more than 100 products at once'
        )
      };
    }

    if (args.threshold !== undefined && (!Number.isInteger(args.threshold) || args.threshold < 0)) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_THRESHOLD',
          'Threshold must be a non-negative integer'
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Validate analytics parameters
   */
  static validateAnalyticsParams(args: any): { isValid: boolean; error?: MCPToolResult } {
    // Validate period format
    if (args.period && !this.isValidPeriod(args.period)) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_PERIOD',
          'Period must be in format like "7d", "30d", "1h", "24h"'
        )
      };
    }

    // Validate limit
    if (args.limit !== undefined && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 1000)) {
      return {
        isValid: false,
        error: MCPErrorHandler.createErrorResult(
          'INVALID_LIMIT',
          'Limit must be an integer between 1 and 1000'
        )
      };
    }

    return { isValid: true };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .substring(0, 1000); // Limit length
  }

  /**
   * Check if string is a valid date
   */
  private static isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.length >= 10;
  }

  /**
   * Check if period string is valid (e.g., "7d", "24h", "30d")
   */
  private static isValidPeriod(period: string): boolean {
    const periodRegex = /^\d+[hdwmy]$/i;
    return periodRegex.test(period);
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    return typeof apiKey === 'string' && 
           apiKey.length >= 16 && 
           apiKey.length <= 128 &&
           /^[a-zA-Z0-9_-]+$/.test(apiKey);
  }

  /**
   * Validate JWT token format
   */
  static validateJWTToken(token: string): boolean {
    return typeof token === 'string' && 
           token.split('.').length === 3;
  }
} 