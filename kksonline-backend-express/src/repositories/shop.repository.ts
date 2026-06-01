import { db, Prisma } from '../config/database.config';
import { logger } from '../utils/logger';
import { InternalServerError, NotFoundError } from '../utils/errors';
import { CacheKeys, withCache, deleteFromCache } from '../utils/cache';
import type { Shop, AppVersion } from '@prisma/client';

export class ShopRepository {
  /**
   * Get shop configuration
   */
  async getConfig(): Promise<Shop | null> {
    return withCache(CacheKeys.SHOP_CONFIG, async () => {
      try {
        const shop = await db.shop.findFirst();
        return shop;
      } catch (error) {
        logger.error('Error fetching shop config', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Check if shipping is enabled
   */
  async isShippingEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config?.is_shipping_enable ?? false;
  }

  /**
   * Get max allowed item quantity
   */
  async getMaxAllowedQuantity(): Promise<number> {
    const config = await this.getConfig();
    return config?.max_allowed_item_quantity ? Number(config.max_allowed_item_quantity) : 50;
  }

  /**
   * Get tax rate
   */
  async getTaxRate(): Promise<number> {
    const config = await this.getConfig();
    return config?.taxrate ? Number(config.taxrate) : 0;
  }

  /**
   * Get shipping price
   */
  async getShippingPrice(): Promise<number> {
    const config = await this.getConfig();
    return config?.shipping_price ? Number(config.shipping_price) : 0;
  }

  /**
   * Get free shipping threshold
   */
  async getFreeShippingThreshold(): Promise<number | null> {
    const config = await this.getConfig();
    return config?.threshold_free_shipping ? Number(config.threshold_free_shipping) : null;
  }

  /**
   * Check if advance payment receipt is mandatory at checkout
   */
  async isAdvancePaymentReceiptMandatory(): Promise<boolean> {
    const config = await this.getConfig();
    return config?.is_advance_payment_receipt_mandatory ?? true;
  }

  /**
   * Update shop configuration (admin)
   */
  async updateConfig(updates: Prisma.ShopUpdateInput): Promise<Shop> {
    // Get current config to get shop_id
    const current = await this.getConfig();
    if (!current) {
      throw new NotFoundError('Shop configuration not found');
    }

    try {
      const shop = await db.shop.update({
        where: { shop_id: current.shop_id },
        data: updates,
      });

      // Invalidate cache
      deleteFromCache(CacheKeys.SHOP_CONFIG);

      return shop;
    } catch (error) {
      logger.error('Error updating shop config', { error });
      throw new InternalServerError('Failed to update shop configuration');
    }
  }

  /**
   * Get latest app version
   */
  async getLatestAppVersion(): Promise<AppVersion | null> {
    return withCache(CacheKeys.APP_VERSION, async () => {
      try {
        const version = await db.appVersion.findFirst({
          orderBy: { created_at: 'desc' },
        });
        return version;
      } catch (error) {
        logger.error('Error fetching app version', { error });
        throw new InternalServerError('Database error');
      }
    });
  }

  /**
   * Check if app update is required
   */
  async checkAppVersion(currentVersion: string): Promise<{
    updateRequired: boolean;
    forceUpdate: boolean;
    isLocked: boolean;
    latestVersion: string | null;
    redirectUrl: string | null;
    description: string | null;
  }> {
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
  async createAppVersion(version: {
    version: string;
    forceUpdate?: boolean;
    appLocked?: boolean;
    redirectUrl: string;
    description?: string;
  }): Promise<AppVersion> {
    try {
      const appVersion = await db.appVersion.create({
        data: {
          version: version.version,
          force_update: version.forceUpdate ?? false,
          app_locked: version.appLocked ?? false,
          redirect_url: version.redirectUrl,
          description: version.description,
        },
      });

      // Invalidate cache
      deleteFromCache(CacheKeys.APP_VERSION);

      return appVersion;
    } catch (error) {
      logger.error('Error creating app version', { error });
      throw new InternalServerError('Failed to create app version');
    }
  }

  /**
   * Compare semantic versions
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  private compareVersions(v1: string, v2: string): number {
    // Remove build number if present (e.g., "1.0.0+1" -> "1.0.0")
    const clean1 = v1.split('+')[0]!;
    const clean2 = v2.split('+')[0]!;

    const parts1 = clean1.split('.').map(Number);
    const parts2 = clean2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] ?? 0;
      const p2 = parts2[i] ?? 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }
}

// Export singleton
export const shopRepository = new ShopRepository();
