import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { MCPConfigService } from '../../config/mcp-config';
import { MCPAuthService } from './auth.service';
import {
  APIClientResponse,
  SearchParams,
  Product,
  Order,
  User,
  InventoryItem,
  ApiResponse,
  PaginationMeta,
} from '../types/api-types';

@Injectable()
export class APIClientService {
  private readonly logger = new Logger(APIClientService.name);
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly mcpConfig: MCPConfigService,
    private readonly authService: MCPAuthService,
  ) {
    this.httpClient = this.createHttpClient();
  }

  // Product Operations
  async searchProducts(params: SearchParams): Promise<ApiResponse<Product[]>> {
    const queryParams = new URLSearchParams();

    if (params.query) queryParams.append('search', params.query);
    if (params.categorySlug)
      queryParams.append('category', params.categorySlug);
    if (params.brandId) queryParams.append('brandId', params.brandId);
    if (params.minPrice)
      queryParams.append('minPrice', params.minPrice.toString());
    if (params.maxPrice)
      queryParams.append('maxPrice', params.maxPrice.toString());
    if (params.inStock !== undefined)
      queryParams.append('inStock', params.inStock.toString());
    if (params.featured !== undefined)
      queryParams.append('featured', params.featured.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.tags?.length) queryParams.append('tags', params.tags.join(','));

    return this.makeRequest<Product[]>({
      method: 'GET',
      url: `/products?${queryParams.toString()}`,
    });
  }

  async getProductById(id: string): Promise<ApiResponse<Product>> {
    return this.makeRequest<Product>({
      method: 'GET',
      url: `/products/${id}`,
    });
  }

  async getProductBySlug(slug: string): Promise<ApiResponse<Product>> {
    return this.makeRequest<Product>({
      method: 'GET',
      url: `/products/slug/${slug}`,
    });
  }

  async getFeaturedProducts(
    limit: number = 10,
  ): Promise<ApiResponse<Product[]>> {
    return this.makeRequest<Product[]>({
      method: 'GET',
      url: `/products/featured?limit=${limit}`,
    });
  }

  async getProductsByCategory(
    categorySlug: string,
    params?: Partial<SearchParams>,
  ): Promise<ApiResponse<Product[]>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);

    return this.makeRequest<Product[]>({
      method: 'GET',
      url: `/categories/${categorySlug}/products?${queryParams.toString()}`,
    });
  }

  async getProductsByBrand(
    brandSlug: string,
    params?: Partial<SearchParams>,
  ): Promise<ApiResponse<Product[]>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);

    return this.makeRequest<Product[]>({
      method: 'GET',
      url: `/brands/${brandSlug}/products?${queryParams.toString()}`,
    });
  }

  // Order Operations
  async getOrderById(id: string): Promise<ApiResponse<Order>> {
    return this.makeRequest<Order>({
      method: 'GET',
      url: `/orders/${id}`,
    });
  }

  async getOrderByNumber(orderNumber: string): Promise<ApiResponse<Order>> {
    return this.makeRequest<Order>({
      method: 'GET',
      url: `/orders/number/${orderNumber}`,
    });
  }

  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ApiResponse<Order[]>> {
    return this.makeRequest<Order[]>({
      method: 'GET',
      url: `/users/${userId}/orders?page=${page}&limit=${limit}`,
    });
  }

  async getOrderAnalytics(
    startDate?: string,
    endDate?: string,
  ): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    return this.makeRequest<any>({
      method: 'GET',
      url: `/analytics/orders?${queryParams.toString()}`,
    });
  }

  // User Operations
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return this.makeRequest<User>({
      method: 'GET',
      url: `/users/${id}`,
    });
  }

  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    return this.makeRequest<User>({
      method: 'GET',
      url: `/users/${userId}/profile`,
    });
  }

  // Inventory Operations
  async getInventoryByProductId(
    productId: string,
  ): Promise<ApiResponse<InventoryItem[]>> {
    return this.makeRequest<InventoryItem[]>({
      method: 'GET',
      url: `/inventory/product/${productId}`,
    });
  }

  async getLowStockItems(
    threshold?: number,
  ): Promise<ApiResponse<InventoryItem[]>> {
    const queryParams = threshold ? `?threshold=${threshold}` : '';
    return this.makeRequest<InventoryItem[]>({
      method: 'GET',
      url: `/inventory/low-stock${queryParams}`,
    });
  }

  async checkBulkAvailability(
    productIds: string[],
  ): Promise<ApiResponse<InventoryItem[]>> {
    return this.makeRequest<InventoryItem[]>({
      method: 'POST',
      url: '/inventory/bulk-check',
      data: { productIds },
    });
  }

  // Analytics Operations
  async getUserActivity(
    userId: string,
    limit: number = 50,
  ): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>({
      method: 'GET',
      url: `/analytics/users/${userId}/activity?limit=${limit}`,
    });
  }

  async getPopularProducts(
    limit: number = 10,
    period: string = '7d',
  ): Promise<ApiResponse<Product[]>> {
    return this.makeRequest<Product[]>({
      method: 'GET',
      url: `/analytics/products/popular?limit=${limit}&period=${period}`,
    });
  }

  async getSearchAnalytics(period: string = '7d'): Promise<ApiResponse<any>> {
    return this.makeRequest<any>({
      method: 'GET',
      url: `/analytics/search?period=${period}`,
    });
  }

  // Search Operations
  async advancedSearch(params: SearchParams): Promise<ApiResponse<any>> {
    return this.makeRequest<any>({
      method: 'POST',
      url: '/search/advanced',
      data: params,
    });
  }

  async getSearchSuggestions(
    query: string,
    limit: number = 5,
  ): Promise<ApiResponse<string[]>> {
    return this.makeRequest<string[]>({
      method: 'GET',
      url: `/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`,
    });
  }

  // Categories and Brands
  async getCategories(): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>({
      method: 'GET',
      url: '/categories',
    });
  }

  async getBrands(): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>({
      method: 'GET',
      url: '/brands',
    });
  }

  private createHttpClient(): AxiosInstance {
    const config = this.mcpConfig.getConfig();

    const client = axios.create({
      baseURL: config.backend.apiUrl,
      timeout: config.backend.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-Client': 'true',
      },
    });

    // Request interceptor to add authentication
    client.interceptors.request.use(
      async (config) => {
        try {
          const authHeaders = await this.authService.getAuthHeaders();

          // Properly set headers
          Object.entries(authHeaders).forEach(([key, value]) => {
            config.headers.set(key, value);
          });

          this.logger.debug(
            `Making ${config.method?.toUpperCase()} request to ${config.url}`,
          );
          return config;
        } catch (error) {
          this.logger.error('Failed to add auth headers to request', error);
          throw error;
        }
      },
      (error) => {
        this.logger.error('Request interceptor error', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging and error handling
    client.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `Response ${response.status} from ${response.config.url}`,
        );
        return response;
      },
      (error) => {
        this.logger.error('API request failed', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      },
    );

    return client;
  }

  private async makeRequest<T>(
    config: AxiosRequestConfig,
    retryCount: number = 0,
  ): Promise<ApiResponse<T>> {
    const maxRetries = this.mcpConfig.getConfig().backend.retryAttempts;

    try {
      // Refresh auth token if needed
      await this.authService.refreshSystemTokenIfNeeded();

      const response: AxiosResponse<ApiResponse<T>> =
        await this.httpClient.request(config);

      return response.data;
    } catch (error: any) {
      // Handle authentication errors
      if (error.response?.status === 401 && retryCount === 0) {
        this.logger.warn(
          'Authentication failed, refreshing token and retrying',
        );
        // Force token refresh
        await this.authService.getSystemToken();
        return this.makeRequest<T>(config, retryCount + 1);
      }

      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || '60';
        this.logger.warn(`Rate limited, waiting ${retryAfter} seconds`);

        if (retryCount < maxRetries) {
          await this.delay(parseInt(retryAfter) * 1000);
          return this.makeRequest<T>(config, retryCount + 1);
        }
      }

      // Handle temporary errors with retry
      if (this.isRetryableError(error) && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        this.logger.warn(
          `Retrying request in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`,
        );

        await this.delay(delay);
        return this.makeRequest<T>(config, retryCount + 1);
      }

      // Transform error for consistent response
      throw this.transformError(error);
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error.response) return true; // Network errors are retryable

    const status = error.response.status;
    return status >= 500 || status === 408 || status === 429;
  }

  private transformError(error: any): HttpException {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      return new HttpException(
        {
          success: false,
          error: message,
          statusCode: status,
        },
        status,
      );
    }

    // Network or other errors
    return new HttpException(
      {
        success: false,
        error: 'Service temporarily unavailable',
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }
}
