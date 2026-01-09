import NodeCache from 'node-cache';
declare const cache: NodeCache;
export declare const CacheKeys: {
    readonly PRODUCTS: "products";
    readonly PRODUCT: "product";
    readonly CATEGORIES: "categories";
    readonly BRANDS: "brands";
    readonly POPULAR_PRODUCTS: "popular_products";
    readonly PRODUCT_VARIANTS: "product_variants";
    readonly SEARCH_SUGGESTIONS: "search_suggestions";
    readonly SHOP_CONFIG: "shop_config";
    readonly APP_VERSION: "app_version";
    readonly CUSTOMER: "customer";
    readonly PRODUCT_IMAGES: "product_images";
};
export declare const generateCacheKey: (prefix: string, params?: Record<string, unknown>) => string;
export declare const getFromCache: <T>(key: string) => T | undefined;
export declare const setInCache: <T>(key: string, value: T, ttl?: number) => boolean;
export declare const deleteFromCache: (key: string) => number;
export declare const deleteByPattern: (pattern: string) => number;
export declare const clearCache: () => void;
export declare const getCacheStats: () => NodeCache.Stats;
export declare const withCache: <T>(key: string, fetchFn: () => Promise<T>, ttl?: number) => Promise<T>;
export { cache };
//# sourceMappingURL=cache.d.ts.map