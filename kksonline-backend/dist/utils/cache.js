import NodeCache from 'node-cache';
import { config } from '../config/env.config.js';
import { logger } from './logger.js';
// Create cache instance with default TTL
const cache = new NodeCache({
    stdTTL: config.cache.ttlSeconds,
    checkperiod: 120, // Check for expired keys every 2 minutes
    useClones: false, // Don't clone objects (better performance)
    deleteOnExpire: true,
});
// Cache key prefixes for different data types
export const CacheKeys = {
    PRODUCTS: 'products',
    PRODUCT: 'product',
    CATEGORIES: 'categories',
    BRANDS: 'brands',
    POPULAR_PRODUCTS: 'popular_products',
    PRODUCT_VARIANTS: 'product_variants',
    SEARCH_SUGGESTIONS: 'search_suggestions',
    SHOP_CONFIG: 'shop_config',
    APP_VERSION: 'app_version',
    CUSTOMER: 'customer',
    PRODUCT_IMAGES: 'product_images',
};
// Generate cache key with parameters
export const generateCacheKey = (prefix, params) => {
    if (!params)
        return prefix;
    const sortedParams = Object.keys(params)
        .sort()
        .map((key) => `${key}:${params[key]}`)
        .join('_');
    return `${prefix}_${sortedParams}`;
};
// Get item from cache
export const getFromCache = (key) => {
    try {
        const value = cache.get(key);
        if (value !== undefined) {
            logger.debug(`Cache HIT: ${key}`);
        }
        else {
            logger.debug(`Cache MISS: ${key}`);
        }
        return value;
    }
    catch (error) {
        logger.error('Cache get error:', { key, error });
        return undefined;
    }
};
// Set item in cache
export const setInCache = (key, value, ttl) => {
    try {
        const success = ttl ? cache.set(key, value, ttl) : cache.set(key, value);
        if (success) {
            logger.debug(`Cache SET: ${key}`);
        }
        return success;
    }
    catch (error) {
        logger.error('Cache set error:', { key, error });
        return false;
    }
};
// Delete item from cache
export const deleteFromCache = (key) => {
    try {
        const count = cache.del(key);
        logger.debug(`Cache DELETE: ${key} (${count} keys deleted)`);
        return count;
    }
    catch (error) {
        logger.error('Cache delete error:', { key, error });
        return 0;
    }
};
// Delete items matching pattern
export const deleteByPattern = (pattern) => {
    try {
        const keys = cache.keys().filter((key) => key.startsWith(pattern));
        const count = cache.del(keys);
        logger.debug(`Cache DELETE by pattern: ${pattern} (${count} keys deleted)`);
        return count;
    }
    catch (error) {
        logger.error('Cache delete by pattern error:', { pattern, error });
        return 0;
    }
};
// Clear all cache
export const clearCache = () => {
    try {
        cache.flushAll();
        logger.info('Cache cleared');
    }
    catch (error) {
        logger.error('Cache clear error:', { error });
    }
};
// Get cache statistics
export const getCacheStats = () => {
    return cache.getStats();
};
// Wrapper function for cache-aside pattern
export const withCache = async (key, fetchFn, ttl) => {
    // Try to get from cache first
    const cached = getFromCache(key);
    if (cached !== undefined) {
        return cached;
    }
    // Fetch fresh data
    const data = await fetchFn();
    // Store in cache
    setInCache(key, data, ttl);
    return data;
};
// Export cache instance for direct access if needed
export { cache };
//# sourceMappingURL=cache.js.map