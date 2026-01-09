import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { InternalServerError, NotFoundError } from '../utils/errors.js';
import { CacheKeys, withCache, deleteFromCache } from '../utils/cache.js';
export class ShopRepository {
    /**
     * Get shop configuration
     */
    async getConfig() {
        return withCache(CacheKeys.SHOP_CONFIG, async () => {
            const { data, error } = await supabaseAdmin
                .from('shop')
                .select('*')
                .limit(1)
                .single();
            if (error && error.code !== 'PGRST116') {
                logger.error('Error fetching shop config', { error });
                throw new InternalServerError('Database error');
            }
            return data;
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
            throw new NotFoundError('Shop configuration not found');
        }
        const { data, error } = await supabaseAdmin
            .from('shop')
            .update(updates)
            .eq('shop_id', current.shop_id)
            .select()
            .single();
        if (error) {
            logger.error('Error updating shop config', { error });
            throw new InternalServerError('Failed to update shop configuration');
        }
        // Invalidate cache
        deleteFromCache(CacheKeys.SHOP_CONFIG);
        return data;
    }
    /**
     * Get latest app version
     */
    async getLatestAppVersion() {
        return withCache(CacheKeys.APP_VERSION, async () => {
            const { data, error } = await supabaseAdmin
                .from('app_versions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (error && error.code !== 'PGRST116') {
                logger.error('Error fetching app version', { error });
                throw new InternalServerError('Database error');
            }
            return data;
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
        const { data, error } = await supabaseAdmin
            .from('app_versions')
            .insert({
            version: version.version,
            force_update: version.forceUpdate ?? false,
            app_locked: version.appLocked ?? false,
            redirect_url: version.redirectUrl,
            description: version.description,
        })
            .select()
            .single();
        if (error) {
            logger.error('Error creating app version', { error });
            throw new InternalServerError('Failed to create app version');
        }
        // Invalidate cache
        deleteFromCache(CacheKeys.APP_VERSION);
        return data;
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
// Export singleton
export const shopRepository = new ShopRepository();
//# sourceMappingURL=shop.repository.js.map