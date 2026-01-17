"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRepository = exports.CategoryRepository = void 0;
const database_config_ts_1 = require("../config/database.config.ts");
const logger_ts_1 = require("../utils/logger.ts");
const errors_ts_1 = require("../utils/errors.ts");
const cache_ts_1 = require("../utils/cache.ts");
class CategoryRepository {
    /**
     * Get all categories
     */
    async findAll() {
        return (0, cache_ts_1.withCache)(cache_ts_1.CacheKeys.CATEGORIES, async () => {
            try {
                const categories = await database_config_ts_1.db.category.findMany({
                    orderBy: { category_name: 'asc' },
                });
                // Sort with "More" category last
                const sorted = categories.sort((a, b) => {
                    if (a.category_name.toLowerCase() === 'more')
                        return 1;
                    if (b.category_name.toLowerCase() === 'more')
                        return -1;
                    return a.category_name.localeCompare(b.category_name);
                });
                return sorted;
            }
            catch (error) {
                logger_ts_1.logger.error('Error fetching categories', { error });
                throw new errors_ts_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get featured categories
     */
    async findFeatured() {
        return (0, cache_ts_1.withCache)(`${cache_ts_1.CacheKeys.CATEGORIES}_featured`, async () => {
            try {
                const categories = await database_config_ts_1.db.category.findMany({
                    where: { isFeatured: true },
                    orderBy: { category_name: 'asc' },
                });
                return categories;
            }
            catch (error) {
                logger_ts_1.logger.error('Error fetching featured categories', { error });
                throw new errors_ts_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get category by ID
     */
    async findById(categoryId) {
        try {
            const category = await database_config_ts_1.db.category.findUnique({
                where: { category_id: categoryId },
            });
            return category;
        }
        catch (error) {
            logger_ts_1.logger.error('Error fetching category', { error, categoryId });
            throw new errors_ts_1.InternalServerError('Database error');
        }
    }
    /**
     * Create category (admin)
     */
    async create(category) {
        try {
            const newCategory = await database_config_ts_1.db.category.create({
                data: category,
            });
            this.invalidateCache();
            return newCategory;
        }
        catch (error) {
            logger_ts_1.logger.error('Error creating category', { error });
            throw new errors_ts_1.InternalServerError('Failed to create category');
        }
    }
    /**
     * Update category (admin)
     */
    async update(categoryId, updates) {
        try {
            const category = await database_config_ts_1.db.category.update({
                where: { category_id: categoryId },
                data: updates,
            });
            this.invalidateCache();
            return category;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_ts_1.NotFoundError('Category not found');
            }
            logger_ts_1.logger.error('Error updating category', { error, categoryId });
            throw new errors_ts_1.InternalServerError('Failed to update category');
        }
    }
    /**
     * Delete category (admin)
     */
    async delete(categoryId) {
        try {
            await database_config_ts_1.db.category.delete({
                where: { category_id: categoryId },
            });
            this.invalidateCache();
            return true;
        }
        catch (error) {
            logger_ts_1.logger.error('Error deleting category', { error, categoryId });
            throw new errors_ts_1.InternalServerError('Failed to delete category');
        }
    }
    /**
     * Update product count for a category
     */
    async updateProductCount(categoryId) {
        try {
            const count = await database_config_ts_1.db.product.count({
                where: {
                    category_id: categoryId,
                    isVisible: true,
                },
            });
            await database_config_ts_1.db.category.update({
                where: { category_id: categoryId },
                data: { product_count: count },
            });
            this.invalidateCache();
        }
        catch (error) {
            logger_ts_1.logger.error('Error updating category product count', { error, categoryId });
        }
    }
    invalidateCache() {
        (0, cache_ts_1.deleteByPattern)(cache_ts_1.CacheKeys.CATEGORIES);
    }
}
exports.CategoryRepository = CategoryRepository;
// Export singleton
exports.categoryRepository = new CategoryRepository();
//# sourceMappingURL=category.repository.js.map