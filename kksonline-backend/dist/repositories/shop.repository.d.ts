import type { Tables, UpdateTables } from '../types/database.types.js';
export declare class ShopRepository {
    /**
     * Get shop configuration
     */
    getConfig(): Promise<Tables<'shop'> | null>;
    /**
     * Check if shipping is enabled
     */
    isShippingEnabled(): Promise<boolean>;
    /**
     * Get max allowed item quantity
     */
    getMaxAllowedQuantity(): Promise<number>;
    /**
     * Get tax rate
     */
    getTaxRate(): Promise<number>;
    /**
     * Get shipping price
     */
    getShippingPrice(): Promise<number>;
    /**
     * Get free shipping threshold
     */
    getFreeShippingThreshold(): Promise<number | null>;
    /**
     * Update shop configuration (admin)
     */
    updateConfig(updates: UpdateTables<'shop'>): Promise<Tables<'shop'>>;
    /**
     * Get latest app version
     */
    getLatestAppVersion(): Promise<Tables<'app_versions'> | null>;
    /**
     * Check if app update is required
     */
    checkAppVersion(currentVersion: string): Promise<{
        updateRequired: boolean;
        forceUpdate: boolean;
        isLocked: boolean;
        latestVersion: string | null;
        redirectUrl: string | null;
        description: string | null;
    }>;
    /**
     * Create app version (admin)
     */
    createAppVersion(version: {
        version: string;
        forceUpdate?: boolean;
        appLocked?: boolean;
        redirectUrl: string;
        description?: string;
    }): Promise<Tables<'app_versions'>>;
    /**
     * Compare semantic versions
     * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
     */
    private compareVersions;
}
export declare const shopRepository: ShopRepository;
//# sourceMappingURL=shop.repository.d.ts.map