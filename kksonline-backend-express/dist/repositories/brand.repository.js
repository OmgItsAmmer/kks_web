"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandRepository = exports.BrandRepository = void 0;
const database_config_1 = require("../config/database.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const cache_1 = require("../utils/cache");
class BrandRepository {
    /**
     * Get all brands
     */
    async findAll() {
        return (0, cache_1.withCache)(cache_1.CacheKeys.BRANDS, async () => {
            try {
                const brands = await database_config_1.db.brand.findMany({
                    orderBy: { brandname: 'asc' },
                });
                return brands;
            }
            catch (error) {
                logger_1.logger.error('Error fetching brands', { error });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get featured brands
     */
    async findFeatured() {
        return (0, cache_1.withCache)(`${cache_1.CacheKeys.BRANDS}_featured`, async () => {
            try {
                const brands = await database_config_1.db.brand.findMany({
                    where: { isFeatured: true },
                    orderBy: { brandname: 'asc' },
                });
                return brands;
            }
            catch (error) {
                logger_1.logger.error('Error fetching featured brands', { error });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get verified brands
     */
    async findVerified() {
        return (0, cache_1.withCache)(`${cache_1.CacheKeys.BRANDS}_verified`, async () => {
            try {
                const brands = await database_config_1.db.brand.findMany({
                    where: { isVerified: true },
                    orderBy: { brandname: 'asc' },
                });
                return brands;
            }
            catch (error) {
                logger_1.logger.error('Error fetching verified brands', { error });
                throw new errors_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get brand by ID
     */
    async findById(brandId) {
        try {
            const brand = await database_config_1.db.brand.findUnique({
                where: { brandID: brandId },
            });
            return brand;
        }
        catch (error) {
            logger_1.logger.error('Error fetching brand', { error, brandId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Create brand (admin)
     */
    async create(brand) {
        try {
            const newBrand = await database_config_1.db.brand.create({
                data: brand,
            });
            this.invalidateCache();
            return newBrand;
        }
        catch (error) {
            logger_1.logger.error('Error creating brand', { error });
            throw new errors_1.InternalServerError('Failed to create brand');
        }
    }
    /**
     * Update brand (admin)
     */
    async update(brandId, updates) {
        try {
            const brand = await database_config_1.db.brand.update({
                where: { brandID: brandId },
                data: updates,
            });
            this.invalidateCache();
            return brand;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError('Brand not found');
            }
            logger_1.logger.error('Error updating brand', { error, brandId });
            throw new errors_1.InternalServerError('Failed to update brand');
        }
    }
    /**
     * Delete brand (admin)
     */
    async delete(brandId) {
        try {
            await database_config_1.db.brand.delete({
                where: { brandID: brandId },
            });
            this.invalidateCache();
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting brand', { error, brandId });
            throw new errors_1.InternalServerError('Failed to delete brand');
        }
    }
    /**
     * Update product count for a brand
     */
    async updateProductCount(brandId) {
        try {
            const count = await database_config_1.db.product.count({
                where: {
                    brandID: brandId,
                    isVisible: true,
                },
            });
            await database_config_1.db.brand.update({
                where: { brandID: brandId },
                data: { product_count: count },
            });
            this.invalidateCache();
        }
        catch (error) {
            logger_1.logger.error('Error updating brand product count', { error, brandId });
        }
    }
    invalidateCache() {
        (0, cache_1.deleteByPattern)(cache_1.CacheKeys.BRANDS);
    }
}
exports.BrandRepository = BrandRepository;
// Export singleton
exports.brandRepository = new BrandRepository();
//# sourceMappingURL=brand.repository.js.map