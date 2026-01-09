import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, InternalServerError } from '../utils/errors.js';
import { CacheKeys, generateCacheKey, deleteByPattern, withCache } from '../utils/cache.js';
import { imageService } from '../services/image.service.js';
export class ProductRepository {
    /**
     * Get product by ID
     */
    async findById(productId) {
        const cacheKey = generateCacheKey(CacheKeys.PRODUCT, { id: productId });
        return withCache(cacheKey, async () => {
            const { data, error } = await supabaseAdmin
                .from('products')
                .select('*')
                .eq('product_id', productId)
                .single();
            if (error && error.code !== 'PGRST116') {
                logger.error('Error fetching product by ID', { error, productId });
                throw new InternalServerError('Database error');
            }
            return data;
        });
    }
    /**
     * Get product with all relations
     */
    async findByIdWithDetails(productId) {
        const cacheKey = generateCacheKey(CacheKeys.PRODUCT, { id: productId, detailed: true });
        return withCache(cacheKey, async () => {
            const { data, error } = await supabaseAdmin
                .from('products')
                .select(`
          *,
          categories(*),
          brands(*),
          product_variants(*)
        `)
                .eq('product_id', productId)
                .single();
            if (error) {
                if (error.code === 'PGRST116')
                    return null;
                logger.error('Error fetching product with details', { error, productId });
                throw new InternalServerError('Database error');
            }
            if (!data)
                return null;
            // Get images
            const images = await imageService.getAllImagesForEntity(productId, 'products');
            const mainImage = await imageService.getMainImageUrl(productId, 'products');
            return {
                ...data,
                category: data.categories,
                brand: data.brands,
                variants: data.product_variants,
                images,
                mainImage: mainImage || undefined,
            };
        });
    }
    /**
     * Get popular products
     */
    async findPopular(params = {}) {
        const { limit = 10, offset = 0 } = params;
        const cacheKey = generateCacheKey(CacheKeys.POPULAR_PRODUCTS, { limit, offset });
        return withCache(cacheKey, async () => {
            const { data, error } = await supabaseAdmin
                .from('products')
                .select('*')
                .eq('ispopular', true)
                .eq('isVisible', true)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                logger.error('Error fetching popular products', { error });
                throw new InternalServerError('Database error');
            }
            return data || [];
        });
    }
    /**
     * Get products by category
     */
    async findByCategory(categoryId, params = {}) {
        const { page = 1, pageSize = 20 } = params;
        const offset = (page - 1) * pageSize;
        const cacheKey = generateCacheKey(CacheKeys.PRODUCTS, { categoryId, page, pageSize });
        return withCache(cacheKey, async () => {
            const { data, error, count } = await supabaseAdmin
                .from('products')
                .select('*', { count: 'exact' })
                .eq('category_id', categoryId)
                .eq('isVisible', true)
                .order('created_at', { ascending: false })
                .range(offset, offset + pageSize - 1);
            if (error) {
                logger.error('Error fetching products by category', { error, categoryId });
                throw new InternalServerError('Database error');
            }
            return {
                products: data || [],
                total: count || 0,
            };
        });
    }
    /**
     * Get products by brand
     */
    async findByBrand(brandId, params = {}) {
        const { limit = 50 } = params;
        const cacheKey = generateCacheKey(CacheKeys.PRODUCTS, { brandId, limit });
        return withCache(cacheKey, async () => {
            const { data, error } = await supabaseAdmin
                .from('products')
                .select('*')
                .eq('brandID', brandId)
                .eq('isVisible', true)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                logger.error('Error fetching products by brand', { error, brandId });
                throw new InternalServerError('Database error');
            }
            return data || [];
        });
    }
    /**
     * Search products
     */
    async search(params) {
        const { query, categoryId, brandId, minPrice, maxPrice, isPopular, tag, sortBy = 'created_at', sortOrder = 'desc', page = 1, pageSize = 20, } = params;
        const offset = (page - 1) * pageSize;
        let dbQuery = supabaseAdmin
            .from('products')
            .select('*', { count: 'exact' })
            .eq('isVisible', true);
        // Apply filters
        if (query) {
            // Sanitize query to prevent wildcard injection
            const sanitizedQuery = query.replace(/[%_]/g, '');
            if (sanitizedQuery.length > 0) {
                dbQuery = dbQuery.ilike('name', `%${sanitizedQuery}%`);
            }
        }
        if (categoryId) {
            dbQuery = dbQuery.eq('category_id', categoryId);
        }
        if (brandId) {
            dbQuery = dbQuery.eq('brandID', brandId);
        }
        if (isPopular !== undefined) {
            dbQuery = dbQuery.eq('ispopular', isPopular);
        }
        if (tag) {
            dbQuery = dbQuery.eq('tag', tag);
        }
        // Price filtering (requires sale_price to be numeric)
        if (minPrice !== undefined) {
            dbQuery = dbQuery.gte('sale_price', minPrice.toString());
        }
        if (maxPrice !== undefined) {
            dbQuery = dbQuery.lte('sale_price', maxPrice.toString());
        }
        // Sorting
        const sortColumn = sortBy === 'popularity' ? 'ispopular' : sortBy === 'price' ? 'sale_price' : sortBy;
        dbQuery = dbQuery.order(sortColumn, { ascending: sortOrder === 'asc' });
        // Pagination
        dbQuery = dbQuery.range(offset, offset + pageSize - 1);
        const { data, error, count } = await dbQuery;
        if (error) {
            logger.error('Error searching products', { error, params });
            throw new InternalServerError('Database error');
        }
        return {
            products: data || [],
            total: count || 0,
        };
    }
    /**
     * Get search suggestions (autocomplete)
     */
    async getSearchSuggestions(query) {
        if (!query || query.length < 2)
            return [];
        const cacheKey = generateCacheKey(CacheKeys.SEARCH_SUGGESTIONS, { query: query.toLowerCase() });
        return withCache(cacheKey, async () => {
            const sanitizedQuery = query.replace(/[%_]/g, '');
            const { data, error } = await supabaseAdmin
                .from('products')
                .select('name')
                .eq('isVisible', true)
                .ilike('name', `%${sanitizedQuery}%`)
                .limit(10);
            if (error) {
                logger.error('Error getting search suggestions', { error, query });
                return [];
            }
            const suggestions = [...new Set(data?.map((p) => p.name) || [])];
            return suggestions;
        }, 300); // 5 min cache for suggestions
    }
    /**
     * Get products by IDs (batch)
     */
    async findByIds(productIds) {
        if (productIds.length === 0)
            return [];
        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .in('product_id', productIds);
        if (error) {
            logger.error('Error fetching products by IDs', { error, productIds });
            throw new InternalServerError('Database error');
        }
        return data || [];
    }
    /**
     * Get all products (with pagination)
     */
    async findAll(params = {}) {
        const { page = 1, pageSize = 20, visibleOnly = false } = params;
        const offset = (page - 1) * pageSize;
        let query = supabaseAdmin
            .from('products')
            .select('*', { count: 'exact' });
        if (visibleOnly) {
            query = query.eq('isVisible', true);
        }
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);
        if (error) {
            logger.error('Error fetching all products', { error });
            throw new InternalServerError('Database error');
        }
        return {
            products: data || [],
            total: count || 0,
        };
    }
    /**
     * Get product count
     */
    async getCount(filters) {
        let query = supabaseAdmin
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('isVisible', true);
        if (filters?.categoryId) {
            query = query.eq('category_id', filters.categoryId);
        }
        if (filters?.brandId) {
            query = query.eq('brandID', filters.brandId);
        }
        if (filters?.isPopular !== undefined) {
            query = query.eq('ispopular', filters.isPopular);
        }
        const { count, error } = await query;
        if (error) {
            logger.error('Error getting product count', { error, filters });
            return 0;
        }
        return count || 0;
    }
    /**
     * Create product (admin)
     */
    async create(product) {
        const { data, error } = await supabaseAdmin
            .from('products')
            .insert(product)
            .select()
            .single();
        if (error) {
            logger.error('Error creating product', { error });
            throw new InternalServerError('Failed to create product');
        }
        this.invalidateCache();
        return data;
    }
    /**
     * Update product (admin)
     */
    async update(productId, updates) {
        const { data, error } = await supabaseAdmin
            .from('products')
            .update(updates)
            .eq('product_id', productId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Product not found');
            }
            logger.error('Error updating product', { error, productId });
            throw new InternalServerError('Failed to update product');
        }
        this.invalidateCache(productId);
        return data;
    }
    /**
     * Delete product (admin)
     */
    async delete(productId) {
        const { error } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('product_id', productId);
        if (error) {
            logger.error('Error deleting product', { error, productId });
            throw new InternalServerError('Failed to delete product');
        }
        this.invalidateCache(productId);
        return true;
    }
    /**
     * Get product variants (visible only)
     */
    async getVariants(productId) {
        const cacheKey = generateCacheKey(CacheKeys.PRODUCT_VARIANTS, { productId });
        return withCache(cacheKey, async () => {
            const { data, error } = await supabaseAdmin
                .from('product_variants')
                .select('*')
                .eq('product_id', productId)
                .eq('is_visible', true)
                .order('sell_price', { ascending: true });
            if (error) {
                logger.error('Error fetching product variants', { error, productId });
                throw new InternalServerError('Database error');
            }
            return data || [];
        });
    }
    /**
     * Get all product variants including hidden (admin)
     */
    async getAllVariants(productId) {
        const { data, error } = await supabaseAdmin
            .from('product_variants')
            .select('*')
            .eq('product_id', productId)
            .order('sell_price', { ascending: true });
        if (error) {
            logger.error('Error fetching all product variants', { error, productId });
            throw new InternalServerError('Database error');
        }
        return data || [];
    }
    /**
     * Get variant by ID
     */
    async getVariantById(variantId) {
        const { data, error } = await supabaseAdmin
            .from('product_variants')
            .select('*')
            .eq('variant_id', variantId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching variant', { error, variantId });
            throw new InternalServerError('Database error');
        }
        return data;
    }
    /**
     * Create product variant (admin)
     */
    async createVariant(variant) {
        const { data, error } = await supabaseAdmin
            .from('product_variants')
            .insert(variant)
            .select()
            .single();
        if (error) {
            logger.error('Error creating variant', { error });
            throw new InternalServerError('Failed to create variant');
        }
        deleteByPattern(`${CacheKeys.PRODUCT_VARIANTS}_productId:${variant.product_id}`);
        return data;
    }
    /**
     * Update product variant (admin)
     */
    async updateVariant(variantId, updates) {
        const { data, error } = await supabaseAdmin
            .from('product_variants')
            .update(updates)
            .eq('variant_id', variantId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Variant not found');
            }
            logger.error('Error updating variant', { error, variantId });
            throw new InternalServerError('Failed to update variant');
        }
        if (data) {
            deleteByPattern(`${CacheKeys.PRODUCT_VARIANTS}_productId:${data.product_id}`);
        }
        return data;
    }
    /**
     * Delete product variant (admin)
     */
    async deleteVariant(variantId) {
        // Get product_id first for cache invalidation
        const variant = await this.getVariantById(variantId);
        if (!variant) {
            throw new NotFoundError('Variant not found');
        }
        const { error } = await supabaseAdmin
            .from('product_variants')
            .delete()
            .eq('variant_id', variantId);
        if (error) {
            logger.error('Error deleting variant', { error, variantId });
            throw new InternalServerError('Failed to delete variant');
        }
        deleteByPattern(`${CacheKeys.PRODUCT_VARIANTS}_productId:${variant.product_id}`);
        return true;
    }
    /**
     * Invalidate product cache
     */
    invalidateCache(productId) {
        if (productId) {
            deleteByPattern(`${CacheKeys.PRODUCT}_id:${productId}`);
        }
        deleteByPattern(CacheKeys.PRODUCTS);
        deleteByPattern(CacheKeys.POPULAR_PRODUCTS);
    }
}
// Export singleton
export const productRepository = new ProductRepository();
//# sourceMappingURL=product.repository.js.map