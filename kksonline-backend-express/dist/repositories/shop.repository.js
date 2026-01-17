"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopRepository = exports.ShopRepository = void 0;
const database_config_1 = require("../config/database.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const cache_1 = require("../utils/cache");
class ShopRepository {
    /**
     * Get shop configuration
     */
    async getConfig() {
        return (0, cache_1.withCache)(cache_1.CacheKeys.SHOP_CONFIG, async () => {
            try {
                const shop = await database_config_1.db.shop.findFirst();
                return shop;
            }
            catch (error) {
                logger_1.logger.error('Error fetching shop config', { error });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Check if shipping is enabled
     */
    async isShippingEnabled() {
        const config = await this.getConfig();
        return config?.is_shipping_enable ?? false;
    }
    /**
     * Get max allowed item quantity
     */
    async getMaxAllowedQuantity() {
        const config = await this.getConfig();
        return config?.max_allowed_item_quantity ? Number(config.max_allowed_item_quantity) : 50;
    }
    /**
     * Get tax rate
     */
    async getTaxRate() {
        const config = await this.getConfig();
        return config?.taxrate ? Number(config.taxrate) : 0;
    }
    /**
     * Get shipping price
     */
    async getShippingPrice() {
        const config = await this.getConfig();
        return config?.shipping_price ? Number(config.shipping_price) : 0;
    }
    /**
     * Get free shipping threshold
     */
    async getFreeShippingThreshold() {
        const config = await this.getConfig();
        return config?.threshold_free_shipping ? Number(config.threshold_free_shipping) : null;
    }
    /**
     * Update shop configuration (admin)
     */
    async updateConfig(updates) {
        // Get current config to get shop_id
        const current = await this.getConfig();
        if (!current) {
            throw new errors_1.NotFoundError('Shop configuration not found');
        }
        try {
            const shop = await database_config_1.db.shop.update({
                where: { shop_id: current.shop_id },
                data: updates,
            });
            // Invalidate cache
            (0, cache_1.deleteFromCache)(cache_1.CacheKeys.SHOP_CONFIG);
            return shop;
        }
        catch (error) {
            logger_1.logger.error('Error updating shop config', { error });
            throw new errors_1.InternalServerError('Failed to update shop configuration');
        }
    }
    /**
     * Get latest app version
     */
    async getLatestAppVersion() {
        return (0, cache_1.withCache)(cache_1.CacheKeys.APP_VERSION, async () => {
            try {
                const version = await database_config_1.db.appVersion.findFirst({
                    orderBy: { created_at: 'desc' },
                });
                return version;
            }
            catch (error) {
                logger_1.logger.error('Error fetching app version', { error });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Check if app update is required
     */
    async checkAppVersion(currentVersion) {
        const latest = await this.getLatestAppVersion();
        if (!latest) {
            return {
                updateRequired: false,
                forceUpdate: false,
                isLocked: false,
                latestVersion: null,
                redirectUrl: null,
                description: null,
            };
        }
        // Parse versions for comparison
        const isNewerVersion = this.compareVersions(latest.version, currentVersion) > 0;
        return {
            updateRequired: isNewerVersion,
            forceUpdate: isNewerVersion && latest.force_update,
            isLocked: latest.app_locked,
            latestVersion: latest.version,
            redirectUrl: latest.redirect_url,
            description: latest.description,
        };
    }
    /**
     * Create app version (admin)
     */
    async createAppVersion(version) {
        try {
            const appVersion = await database_config_1.db.appVersion.create({
                data: {
                    version: version.version,
                    force_update: version.forceUpdate ?? false,
                    app_locked: version.appLocked ?? false,
                    redirect_url: version.redirectUrl,
                    description: version.description,
                },
            });
            // Invalidate cache
            (0, cache_1.deleteFromCache)(cache_1.CacheKeys.APP_VERSION);
            return appVersion;
        }
        catch (error) {
            logger_1.logger.error('Error creating app version', { error });
            throw new errors_1.InternalServerError('Failed to create app version');
        }
    }
    /**
     * Compare semantic versions
     * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
     */
    compareVersions(v1, v2) {
        // Remove build number if present (e.g., "1.0.0+1" -> "1.0.0")
        const clean1 = v1.split('+')[0];
        const clean2 = v2.split('+')[0];
        const parts1 = clean1.split('.').map(Number);
        const parts2 = clean2.split('.').map(Number);
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] ?? 0;
            const p2 = parts2[i] ?? 0;
            if (p1 > p2)
                return 1;
            if (p1 < p2)
                return -1;
        }
        return 0;
    }
}
exports.ShopRepository = ShopRepository;
// Export singleton
exports.shopRepository = new ShopRepository();
//# sourceMappingURL=shop.repository.js.map