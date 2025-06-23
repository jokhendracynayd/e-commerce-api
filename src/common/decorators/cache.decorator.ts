import { SetMetadata, applyDecorators } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { UseInterceptors } from '@nestjs/common';

export const CACHE_CONFIG_KEY = 'cacheConfig';

export interface CacheConfig {
  ttl?: number;
  keyPrefix?: string;
  tags?: string[];
  invalidateOn?: string[];
  isUserSpecific?: boolean;
}

/**
 * Enhanced caching decorator with better control
 * @param config Cache configuration options
 */
export function CacheResponse(config: CacheConfig = {}) {
  const decorators = [UseInterceptors(CacheInterceptor)];

  if (config.ttl) {
    decorators.push(CacheTTL(config.ttl));
  }

  if (config.keyPrefix) {
    decorators.push(CacheKey(config.keyPrefix));
  }

  decorators.push(SetMetadata(CACHE_CONFIG_KEY, config));

  return applyDecorators(...decorators);
}

/**
 * Predefined cache configurations for common use cases
 */
export const CacheConfigs = {
  // Short-term cache for frequently accessed data
  SHORT: { ttl: 300, keyPrefix: 'short' }, // 5 minutes

  // Medium-term cache for semi-static data
  MEDIUM: { ttl: 1800, keyPrefix: 'medium' }, // 30 minutes

  // Long-term cache for static data
  LONG: { ttl: 3600, keyPrefix: 'long' }, // 1 hour

  // User-specific cache
  USER_SPECIFIC: {
    ttl: 900,
    keyPrefix: 'user',
    isUserSpecific: true,
  }, // 15 minutes

  // Product catalog cache
  PRODUCTS: {
    ttl: 1800,
    keyPrefix: 'products',
    tags: ['products'],
    invalidateOn: ['product:created', 'product:updated', 'product:deleted'],
  },

  // Category cache
  CATEGORIES: {
    ttl: 3600,
    keyPrefix: 'categories',
    tags: ['categories'],
    invalidateOn: ['category:created', 'category:updated', 'category:deleted'],
  },

  // Brand cache
  BRANDS: {
    ttl: 3600,
    keyPrefix: 'brands',
    tags: ['brands'],
    invalidateOn: ['brand:created', 'brand:updated', 'brand:deleted'],
  },

  // Inventory cache (short TTL due to frequent changes)
  INVENTORY: {
    ttl: 60,
    keyPrefix: 'inventory',
    tags: ['inventory'],
    invalidateOn: ['inventory:updated', 'order:created'],
  },

  // Search results cache
  SEARCH: {
    ttl: 600,
    keyPrefix: 'search',
    tags: ['search'],
  },

  // Cart cache (user-specific, short TTL)
  CART: {
    ttl: 300,
    keyPrefix: 'cart',
    isUserSpecific: true,
    tags: ['cart'],
    invalidateOn: ['cart:updated', 'cart:item:added', 'cart:item:removed'],
  },
};

/**
 * Quick cache decorators for common use cases
 */
export const CacheShort = () => CacheResponse(CacheConfigs.SHORT);
export const CacheMedium = () => CacheResponse(CacheConfigs.MEDIUM);
export const CacheLong = () => CacheResponse(CacheConfigs.LONG);
export const CacheUserSpecific = () =>
  CacheResponse(CacheConfigs.USER_SPECIFIC);
export const CacheProducts = () => CacheResponse(CacheConfigs.PRODUCTS);
export const CacheCategories = () => CacheResponse(CacheConfigs.CATEGORIES);
export const CacheBrands = () => CacheResponse(CacheConfigs.BRANDS);
export const CacheInventory = () => CacheResponse(CacheConfigs.INVENTORY);
export const CacheSearch = () => CacheResponse(CacheConfigs.SEARCH);
export const CacheCart = () => CacheResponse(CacheConfigs.CART);
