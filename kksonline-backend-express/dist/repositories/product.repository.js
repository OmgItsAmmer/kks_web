"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = exports.ProductRepository = void 0;
const database_config_ts_1 = require("../config/database.config.ts");
const logger_ts_1 = require("../utils/logger.ts");
const errors_ts_1 = require("../utils/errors.ts");
const cache_ts_1 = require("../utils/cache.ts");
const supabase_image_service_ts_1 = require("../services/supabase-image.service.ts");
class ProductRepository {
    /**
     * Get product by ID
     */
    async findById(productId) {
        const cacheKey = (0, cache_ts_1.generateCacheKey)(cache_ts_1.CacheKeys.PRODUCT, { id: productId });
        return (0, cache_ts_1.withCache)(cacheKey, async () => {
            try {
                const product = await database_config_ts_1.db.product.findUnique({
                    where: { product_id: productId },
                });
                return product;
            }
            catch (error) {
                logger_ts_1.logger.error('Error fetching product by ID', { error, productId });
                throw new errors_ts_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get product with all relations
     */
    async findByIdWithDetails(productId) {
        const cacheKey = (0, cache_ts_1.generateCacheKey)(cache_ts_1.CacheKeys.PRODUCT, { id: productId, detailed: true });
        return (0, cache_ts_1.withCache)(cacheKey, async () => {
            try {
                const product = await database_config_ts_1.db.product.findUnique({
                    where: { product_id: productId },
                    include: {
                        category: true,
                        brand: true,
                        variants: true,
                    },
                });
                if (!product)
                    return null;
                // Get images
                const images = await supabase_image_service_ts_1.supabaseImageService.getAllImagesForEntity(productId, 'products');
                const mainImage = await supabase_image_service_ts_1.supabaseImageService.getMainImageUrl(productId, 'products');
                return {
                    ...product,
                    category: product.category || undefined,
                    brand: product.brand || undefined,
                    images,
                    mainImage: mainImage || undefined,
                };
            }
            catch (error) {
                logger_ts_1.logger.error('Error fetching product with details', { error, productId });
                throw new errors_ts_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get popular products
     */
    async findPopular(params = {}) {
        const { limit = 10, offset = 0 } = params;
        const cacheKey = (0, cache_ts_1.generateCacheKey)(cache_ts_1.CacheKeys.POPULAR_PRODUCTS, { limit, offset });
        return (0, cache_ts_1.withCache)(cacheKey, async () => {
            try {
                const products = await database_config_ts_1.db.product.findMany({
                    where: {
                        ispopular: true,
                        isVisible: true,
                    },
                    orderBy: { created_at: 'desc' },
                    skip: offset,
                    take: limit,
                });
                return products;
            }
            catch (error) {
                logger_ts_1.logger.error('Error fetching popular products', { error });
                throw new errors_ts_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get products by category
     */
    async findByCategory(categoryId, params = {}) {
        const { page = 1, pageSize = 20 } = params;
        const offset = (page - 1) * pageSize;
        const cacheKey = (0, cache_ts_1.generateCacheKey)(cache_ts_1.CacheKeys.PRODUCTS, { categoryId, page, pageSize });
        return (0, cache_ts_1.withCache)(cacheKey, async () => {
            try {
                const [products, total] = await Promise.all([
                    database_config_ts_1.db.product.findMany({
                        where: {
                            category_id: categoryId,
                            isVisible: true,
                        },
                        orderBy: { created_at: 'desc' },
                        skip: offset,
                        take: pageSize,
                    }),
                    database_config_ts_1.db.product.count({
                        where: {
                            category_id: categoryId,
                            isVisible: true,
                        },
                    }),
                ]);
                return { products, total };
            }
            catch (error) {
                logger_ts_1.logger.error('Error fetching products by category', { error, categoryId });
                throw new errors_ts_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get products by brand
     */
    async findByBrand(brandId, params = {}) {
        const { limit = 50 } = params;
        const cacheKey = (0, cache_ts_1.generateCacheKey)(cache_ts_1.CacheKeys.PRODUCTS, { brandId, limit });
        return (0, cache_ts_1.withCache)(cacheKey, async () => {
            try {
                const products = await database_config_ts_1.db.product.findMany({
                    where: {
                        brandID: brandId,
                        isVisible: true,
                    },
                    orderBy: { created_at: 'desc' },
                    take: limit,
                });
                return products;
            }
            catch (error) {
                logger_ts_1.logger.error('Error fetching products by brand', { error, brandId });
                throw new errors_ts_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Search products
     */
    async search(params) {
        const { query, categoryId, brandId, minPrice, maxPrice, isPopular, tag, sortBy = 'created_at', sortOrder = 'desc', page = 1, pageSize = 20, } = params;
        const offset = (page - 1) * pageSize;
        try {
            const where = {
                isVisible: true,
            };
            // Apply filters
            if (query) {
                const sanitizedQuery = query.replace(/[%_]/g, '');
                if (sanitizedQuery.length > 0) {
                    where.name = { contains: sanitizedQuery, mode: 'insensitive' };
                }
            }
            if (categoryId) {
                where.category_id = categoryId;
            }
            if (brandId) {
                where.brandID = brandId;
            }
            if (isPopular !== undefined) {
                where.ispopular = isPopular;
            }
            if (tag) {
                where.tag = tag;
            }
            // Price filtering
            if (minPrice !== undefined || maxPrice !== undefined) {
                where.sale_price = {};
                if (minPrice !== undefined) {
                    where.sale_price.gte = minPrice.toString();
                }
                if (maxPrice !== undefined) {
                    where.sale_price.lte = maxPrice.toString();
                }
            }
            // Sorting
            const orderBy = {};
            const sortColumn = sortBy === 'popularity' ? 'ispopular' : sortBy === 'price' ? 'sale_price' : sortBy;
            orderBy[sortColumn] = sortOrder;
            const [products, total] = await Promise.all([
                database_config_ts_1.db.product.findMany({
                    where,
                    orderBy,
                    skip: offset,
                    take: pageSize,
                }),
                database_config_ts_1.db.product.count({ where }),
            ]);
            return { products, total };
        }
        catch (error) {
            logger_ts_1.logger.error('Error searching products', { error, params });
            throw new errors_ts_1.InternalServerError('Database error');
        }
    }
    /**
     * Get search suggestions (autocomplete)
     */
    async getSearchSuggestions(query) {
        if (!query || query.length < 2)
            return [];
        const cacheKey = (0, cache_ts_1.generateCacheKey)(cache_ts_1.CacheKeys.SEARCH_SUGGESTIONS, { query: query.toLowerCase() });
        return (0, cache_ts_1.withCache)(cacheKey, async () => {
            try {
                const sanitizedQuery = query.replace(/[%_]/g, '');
                const products = await database_config_ts_1.db.product.findMany({
                    where: {
                        isVisible: true,
                        name: { contains: sanitizedQuery, mode: 'insensitive' },
                    },
                    select: { name: true },
                    take: 10,
                });
                const suggestions = [...new Set(products.map((p) => p.name))];
                return suggestions;
            }
            catch (error) {
                logger_ts_1.logger.error('Error getting search suggestions', { error, query });
                return [];
            }
        }, 300);
    }
    /**
     * Get products by IDs (batch)
     */
    async findByIds(productIds) {
        if (productIds.length === 0)
            return [];
        try {
            const products = await database_config_ts_1.db.product.findMany({
                where: { product_id: { in: productIds } },
            });
            return products;
        }
        catch (error) {
            logger_ts_1.logger.error('Error fetching products by IDs', { error, productIds });
            throw new errors_ts_1.InternalServerError('Database error');
        }
    }
    /**
     * Get all products (with pagination)
     */
    async findAll(params = {}) {
        const { page = 1, pageSize = 20, visibleOnly = false } = params;
        const offset = (page - 1) * pageSize;
        try {
            const where = {};
            if (visibleOnly) {
                where.isVisible = true;
            }
            const [products, total] = await Promise.all([
                database_config_ts_1.db.product.findMany({
                    where,
                    orderBy: { created_at: 'desc' },
                    skip: offset,
                    take: pageSize,
                }),
                database_config_ts_1.db.product.count({ where }),
            ]);
            return { products, total };
        }
        catch (error) {
            logger_ts_1.logger.error('Error fetching all products', { error });
            throw new errors_ts_1.InternalServerError('Database error');
        }
    }
    /**
     * Get product count
     */
    async getCount(filters) {
        try {
            const where = { isVisible: true };
            if (filters?.categoryId) {
                where.category_id = filters.categoryId;
            }
            if (filters?.brandId) {
                where.brandID = filters.brandId;
            }
            if (filters?.isPopular !== undefined) {
                where.ispopular = filters.isPopular;
            }
            const count = await database_config_ts_1.db.product.count({ where });
            return count;
        }
        catch (error) {
            logger_ts_1.logger.error('Error getting product count', { error, filters });
            return 0;
        }
    }
    /**
     * Create product (admin)
     */
    async create(product) {
        try {
            const newProduct = await database_config_ts_1.db.product.create({
                data: product,
            });
            this.invalidateCache();
            return newProduct;
        }
        catch (error) {
            logger_ts_1.logger.error('Error creating product', { error });
            throw new errors_ts_1.InternalServerError('Failed to create product');
        }
    }
    /**
     * Update product (admin)
     */
    async update(productId, updates) {
        try {
            const product = await database_config_ts_1.db.product.update({
                where: { product_id: productId },
                data: updates,
            });
            this.invalidateCache(productId);
            return product;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_ts_1.NotFoundError('Product not found');
            }
            logger_ts_1.logger.error('Error updating product', { error, productId });
            throw new errors_ts_1.InternalServerError('Failed to update product');
        }
    }
    /**
     * Delete product (admin)
     */
    async delete(productId) {
        try {
            await database_config_ts_1.db.product.delete({
                where: { product_id: productId },
            });
            this.invalidateCache(productId);
            return true;
        }
        catch (error) {
            logger_ts_1.logger.error('Error deleting product', { error, productId });
            throw new errors_ts_1.InternalServerError('Failed to delete product');
        }
    }
    /**
     * Get product variants (visible only)
     */
    async getVariants(productId) {
        const cacheKey = (0, cache_ts_1.generateCacheKey)(cache_ts_1.CacheKeys.PRODUCT_VARIANTS, { productId });
        return (0, cache_ts_1.withCache)(cacheKey, async () => {
            try {
                const variants = await database_config_ts_1.db.productVariant.findMany({
                    where: {
                        product_id: productId,
                        is_visible: true,
                    },
                    orderBy: { sell_price: 'asc' },
                });
                return variants;
            }
            catch (error) {
                logger_ts_1.logger.error('Error fetching product variants', { error, productId });
                throw new errors_ts_1.InternalServerError('Database error');
            }
        });
    }
    /**
     * Get all product variants including hidden (admin)
     */
    async getAllVariants(productId) {
        try {
            const variants = await database_config_ts_1.db.productVariant.findMany({
                where: { product_id: productId },
                orderBy: { sell_price: 'asc' },
            });
            return variants;
        }
        catch (error) {
            logger_ts_1.logger.error('Error fetching all product variants', { error, productId });
            throw new errors_ts_1.InternalServerError('Database error');
        }
    }
    /**
     * Get variant by ID
     */
    async getVariantById(variantId) {
        try {
            const variant = await database_config_ts_1.db.productVariant.findUnique({
                where: { variant_id: variantId },
            });
            return variant;
        }
        catch (error) {
            logger_ts_1.logger.error('Error fetching variant', { error, variantId });
            throw new errors_ts_1.InternalServerError('Database error');
        }
    }
    /**
     * Create product variant (admin)
     */
    async createVariant(variant) {
        try {
            const newVariant = await database_config_ts_1.db.productVariant.create({
                data: variant,
            });
            (0, cache_ts_1.deleteByPattern)(`${cache_ts_1.CacheKeys.PRODUCT_VARIANTS}_productId:`);
            return newVariant;
        }
        catch (error) {
            logger_ts_1.logger.error('Error creating variant', { error });
            throw new errors_ts_1.InternalServerError('Failed to create variant');
        }
    }
    /**
     * Update product variant (admin)
     */
    async updateVariant(variantId, updates) {
        try {
            const variant = await database_config_ts_1.db.productVariant.update({
                where: { variant_id: variantId },
                data: updates,
            });
            (0, cache_ts_1.deleteByPattern)(`${cache_ts_1.CacheKeys.PRODUCT_VARIANTS}_productId:${variant.product_id}`);
            return variant;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_ts_1.NotFoundError('Variant not found');
            }
            logger_ts_1.logger.error('Error updating variant', { error, variantId });
            throw new errors_ts_1.InternalServerError('Failed to update variant');
        }
    }
    /**
     * Delete product variant (admin)
     */
    async deleteVariant(variantId) {
        // Get product_id first for cache invalidation
        const variant = await this.getVariantById(variantId);
        if (!variant) {
            throw new errors_ts_1.NotFoundError('Variant not found');
        }
        try {
            await database_config_ts_1.db.productVariant.delete({
                where: { variant_id: variantId },
            });
            (0, cache_ts_1.deleteByPattern)(`${cache_ts_1.CacheKeys.PRODUCT_VARIANTS}_productId:${variant.product_id}`);
            return true;
        }
        catch (error) {
            logger_ts_1.logger.error('Error deleting variant', { error, variantId });
            throw new errors_ts_1.InternalServerError('Failed to delete variant');
        }
    }
    /**
     * Invalidate product cache
     */
    invalidateCache(productId) {
        if (productId) {
            (0, cache_ts_1.deleteByPattern)(`${cache_ts_1.CacheKeys.PRODUCT}_id:${productId}`);
        }
        (0, cache_ts_1.deleteByPattern)(cache_ts_1.CacheKeys.PRODUCTS);
        (0, cache_ts_1.deleteByPattern)(cache_ts_1.CacheKeys.POPULAR_PRODUCTS);
    }
}
exports.ProductRepository = ProductRepository;
// Export singleton
exports.productRepository = new ProductRepository();
//# sourceMappingURL=product.repository.js.map