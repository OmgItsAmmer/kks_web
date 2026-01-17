"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = exports.withCache = exports.getCacheStats = exports.clearCache = exports.deleteByPattern = exports.deleteFromCache = exports.setInCache = exports.getFromCache = exports.generateCacheKey = exports.CacheKeys = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const env_config_js_1 = require("../config/env.config.js");
const logger_js_1 = require("./logger.js");
// Create cache instance with default TTL
const cache = new node_cache_1.default({
    stdTTL: env_config_js_1.config.cache.ttlSeconds,
    checkperiod: 120, // Check for expired keys every 2 minutes
    useClones: false, // Don't clone objects (better performance)
    deleteOnExpire: true,
});
exports.cache = cache;
// Cache key prefixes for different data types
exports.CacheKeys = {
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
const generateCacheKey = (prefix, params) => {
    if (!params)
        return prefix;
    const sortedParams = Object.keys(params)
        .sort()
        .map((key) => `${key}:${params[key]}`)
        .join('_');
    return `${prefix}_${sortedParams}`;
};
exports.generateCacheKey = generateCacheKey;
// Get item from cache
const getFromCache = (key) => {
    try {
        const value = cache.get(key);
        if (value !== undefined) {
            logger_js_1.logger.debug(`Cache HIT: ${key}`);
        }
        else {
            logger_js_1.logger.debug(`Cache MISS: ${key}`);
        }
        return value;
    }
    catch (error) {
        logger_js_1.logger.error('Cache get error:', { key, error });
        return undefined;
    }
};
exports.getFromCache = getFromCache;
// Set item in cache
const setInCache = (key, value, ttl) => {
    try {
        const success = ttl ? cache.set(key, value, ttl) : cache.set(key, value);
        if (success) {
            logger_js_1.logger.debug(`Cache SET: ${key}`);
        }
        return success;
    }
    catch (error) {
        logger_js_1.logger.error('Cache set error:', { key, error });
        return false;
    }
};
exports.setInCache = setInCache;
// Delete item from cache
const deleteFromCache = (key) => {
    try {
        const count = cache.del(key);
        logger_js_1.logger.debug(`Cache DELETE: ${key} (${count} keys deleted)`);
        return count;
    }
    catch (error) {
        logger_js_1.logger.error('Cache delete error:', { key, error });
        return 0;
    }
};
exports.deleteFromCache = deleteFromCache;
// Delete items matching pattern
const deleteByPattern = (pattern) => {
    try {
        const keys = cache.keys().filter((key) => key.startsWith(pattern));
        const count = cache.del(keys);
        logger_js_1.logger.debug(`Cache DELETE by pattern: ${pattern} (${count} keys deleted)`);
        return count;
    }
    catch (error) {
        logger_js_1.logger.error('Cache delete by pattern error:', { pattern, error });
        return 0;
    }
};
exports.deleteByPattern = deleteByPattern;
// Clear all cache
const clearCache = () => {
    try {
        cache.flushAll();
        logger_js_1.logger.info('Cache cleared');
    }
    catch (error) {
        logger_js_1.logger.error('Cache clear error:', { error });
    }
};
exports.clearCache = clearCache;
// Get cache statistics
const getCacheStats = () => {
    return cache.getStats();
};
exports.getCacheStats = getCacheStats;
// Wrapper function for cache-aside pattern
const withCache = async (key, fetchFn, ttl) => {
    // Try to get from cache first
    const cached = (0, exports.getFromCache)(key);
    if (cached !== undefined) {
        return cached;
    }
    // Fetch fresh data
    const data = await fetchFn();
    // Store in cache
    (0, exports.setInCache)(key, data, ttl);
    return data;
};
exports.withCache = withCache;
//# sourceMappingURL=cache.js.map