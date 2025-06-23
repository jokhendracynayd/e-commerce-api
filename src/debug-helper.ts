/**
 * Debug Helper Functions for E-commerce API
 * Use these functions to debug your application effectively
 */

export class DebugHelper {
  /**
   * Log detailed information about an object with proper formatting
   */
  static logObject(label: string, obj: any, depth: number = 2): void {
    console.log(`🔍 ${label}:`);
    console.log(JSON.stringify(obj, null, depth));
  }

  /**
   * Log API request details
   */
  static logRequest(
    method: string,
    url: string,
    body?: any,
    headers?: any,
  ): void {
    console.log(`📡 ${method} ${url}`);
    if (body) {
      console.log('📦 Body:', JSON.stringify(body, null, 2));
    }
    if (headers) {
      console.log('📋 Headers:', JSON.stringify(headers, null, 2));
    }
  }

  /**
   * Log API response details
   */
  static logResponse(statusCode: number, body?: any, headers?: any): void {
    console.log(`📤 Response ${statusCode}`);
    if (body) {
      console.log('📦 Response Body:', JSON.stringify(body, null, 2));
    }
    if (headers) {
      console.log('📋 Response Headers:', JSON.stringify(headers, null, 2));
    }
  }

  /**
   * Log database query details
   */
  static logQuery(query: string, params?: any[]): void {
    console.log(`🗄️ Query: ${query}`);
    if (params && params.length > 0) {
      console.log('📝 Parameters:', params);
    }
  }

  /**
   * Log error with stack trace
   */
  static logError(error: Error, context?: string): void {
    console.error(`❌ Error${context ? ` in ${context}` : ''}:`, error.message);
    console.error('📍 Stack:', error.stack);
  }

  /**
   * Performance measurement helper
   */
  static startTimer(label: string): () => void {
    const start = Date.now();
    console.log(`⏱️ Starting: ${label}`);

    return () => {
      const duration = Date.now() - start;
      console.log(`⏱️ Completed: ${label} (${duration}ms)`);
    };
  }

  /**
   * Debug middleware for Express/NestJS
   */
  static debugMiddleware(req: any, res: any, next: any): void {
    const start = Date.now();

    // Log request
    this.logRequest(req.method, req.url, req.body, req.headers);

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk: any, encoding: any) {
      const duration = Date.now() - start;
      console.log(`📤 Response ${res.statusCode} (${duration}ms)`);
      originalEnd.call(this, chunk, encoding);
    };

    next();
  }
}

// Example usage:
/*
// In your service or controller:
import { DebugHelper } from '../debug-helper';

export class ProductsService {
  async getProducts() {
    const timer = DebugHelper.startTimer('getProducts');
    
    try {
      DebugHelper.logQuery('SELECT * FROM products WHERE is_active = ?', [true]);
      
      const products = await this.prisma.product.findMany({
        where: { isActive: true }
      });
      
      DebugHelper.logObject('Found Products', products);
      
      timer(); // End timer
      return products;
    } catch (error) {
      DebugHelper.logError(error, 'getProducts');
      throw error;
    }
  }
}
*/
