import { Injectable, Logger } from '@nestjs/common';
import { MCPConfigService } from '../../config/mcp-config';

interface CacheItem<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

@Injectable()
export class MCPCacheService {
  private readonly logger = new Logger(MCPCacheService.name);
  private readonly cache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly mcpConfig: MCPConfigService) {
    const config = this.mcpConfig.getConfig();
    this.defaultTTL = config.cache.ttl;
    this.maxSize = config.cache.maxSize;

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );

    this.logger.log(
      `MCP Cache initialized with TTL: ${this.defaultTTL}ms, Max Size: ${this.maxSize}`,
    );
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`Cache item expired and removed: ${key}`);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);
    return item.data;
  }

  /**
   * Set item in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiry = now + (ttl || this.defaultTTL);

    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data: value,
      expiresAt: expiry,
      createdAt: now,
    });

    this.logger.debug(
      `Cache set: ${key} (expires at ${new Date(expiry).toISOString()})`,
    );
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.logger.debug(`Cache item deleted: ${key}`);
    }
    return result;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cache cleared: ${size} items removed`);
  }

  /**
   * Get or set pattern - retrieve from cache or fetch and cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch the data
    try {
      this.logger.debug(`Cache miss, fetching: ${key}`);
      const data = await fetchFn();

      // Store in cache
      this.set(key, data, ttl);

      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch data for cache key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    itemsExpired: number;
  } {
    let expiredCount = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need hit/miss tracking for this
      itemsExpired: expiredCount,
    };
  }

  /**
   * Generate cache key for API responses
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    const keyParts = sortedKeys.map((key) => `${key}:${params[key]}`);
    return `${prefix}:${keyParts.join('|')}`;
  }

  /**
   * Generate cache key with user context
   */
  static generateUserKey(
    userId: string,
    prefix: string,
    params: Record<string, any>,
  ): string {
    return `user:${userId}:${this.generateKey(prefix, params)}`;
  }

  /**
   * Invalidate cache keys by pattern
   */
  invalidateByPattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.log(
        `Invalidated ${deletedCount} cache items matching pattern: ${pattern}`,
      );
    }

    return deletedCount;
  }

  /**
   * Invalidate product-related cache
   */
  invalidateProductCache(productId?: string): number {
    if (productId) {
      return this.invalidateByPattern(`product.*:.*productId:${productId}.*`);
    } else {
      return this.invalidateByPattern('product.*');
    }
  }

  /**
   * Invalidate category-related cache
   */
  invalidateCategoryCache(categorySlug?: string): number {
    if (categorySlug) {
      return this.invalidateByPattern(`.*category.*:.*${categorySlug}.*`);
    } else {
      return this.invalidateByPattern('.*category.*');
    }
  }

  /**
   * Invalidate brand-related cache
   */
  invalidateBrandCache(brandSlug?: string): number {
    if (brandSlug) {
      return this.invalidateByPattern(`.*brand.*:.*${brandSlug}.*`);
    } else {
      return this.invalidateByPattern('.*brand.*');
    }
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleanup removed ${removedCount} expired cache items`);
    }
  }

  /**
   * Evict oldest item when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted oldest cache item: ${oldestKey}`);
    }
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    this.logger.log('MCP Cache service destroyed');
  }
}
