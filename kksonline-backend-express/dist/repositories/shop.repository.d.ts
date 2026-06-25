import { Prisma } from '../config/database.config';
import type { Shop, AppVersion } from '@prisma/client';
export declare class ShopRepository {
    /**
     * Get shop configuration
     */
    getConfig(): Promise<Shop | null>;
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
     * Check if advance payment receipt is mandatory at checkout
     */
    isAdvancePaymentReceiptMandatory(): Promise<boolean>;
    /**
     * Update shop configuration (admin)
     */
    updateConfig(updates: Prisma.ShopUpdateInput): Promise<Shop>;
    /**
     * Get latest app version
     */
    getLatestAppVersion(): Promise<AppVersion | null>;
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
    }): Promise<AppVersion>;
    /**
     * Compare semantic versions
     * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
     */
    private compareVersions;
}
export declare const shopRepository: ShopRepository;
//# sourceMappingURL=shop.repository.d.ts.map