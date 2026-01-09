import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { InternalServerError, NotFoundError } from '../utils/errors.js';
import { CacheKeys, withCache, deleteByPattern } from '../utils/cache.js';
export class CategoryRepository {
    /**
     * Get all categories
     */
    async findAll() {
        return withCache(CacheKeys.CATEGORIES, async () => {
            const { data, error } = await supabaseAdmin
                .from('categories')
                .select('*')
                .order('category_name', { ascending: true });
            if (error) {
                logger.error('Error fetching categories', { error });
                throw new InternalServerError('Database error');
            }
            // Sort with "More" category last
            const sorted = (data || []).sort((a, b) => {
                if (a.category_name.toLowerCase() === 'more')
                    return 1;
                if (b.category_name.toLowerCase() === 'more')
                    return -1;
                return a.category_name.localeCompare(b.category_name);
            });
            return sorted;
        });
    }
    /**
     * Get featured categories
     */
    async findFeatured() {
        return withCache(`${CacheKeys.CATEGORIES}_featured`, async () => {
            const { data, error } = await supabaseAdmin
                .from('categories')
                .select('*')
                .eq('isFeatured', true)
                .order('category_name', { ascending: true });
            if (error) {
                logger.error('Error fetching featured categories', { error });
                throw new InternalServerError('Database error');
            }
            return data || [];
        });
    }
    /**
     * Get category by ID
     */
    async findById(categoryId) {
        const { data, error } = await supabaseAdmin
            .from('categories')
            .select('*')
            .eq('category_id', categoryId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching category', { error, categoryId });
            throw new InternalServerError('Database error');
        }
        return data;
    }
    /**
     * Create category (admin)
     */
    async create(category) {
        const { data, error } = await supabaseAdmin
            .from('categories')
            .insert(category)
            .select()
            .single();
        if (error) {
            logger.error('Error creating category', { error });
            throw new InternalServerError('Failed to create category');
        }
        this.invalidateCache();
        return data;
    }
    /**
     * Update category (admin)
     */
    async update(categoryId, updates) {
        const { data, error } = await supabaseAdmin
            .from('categories')
            .update(updates)
            .eq('category_id', categoryId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Category not found');
            }
            logger.error('Error updating category', { error, categoryId });
            throw new InternalServerError('Failed to update category');
        }
        this.invalidateCache();
        return data;
    }
    /**
     * Delete category (admin)
     */
    async delete(categoryId) {
        const { error } = await supabaseAdmin
            .from('categories')
            .delete()
            .eq('category_id', categoryId);
        if (error) {
            logger.error('Error deleting category', { error, categoryId });
            throw new InternalServerError('Failed to delete category');
        }
        this.invalidateCache();
        return true;
    }
    /**
     * Update product count for a category
     */
    async updateProductCount(categoryId) {
        const { count, error: countError } = await supabaseAdmin
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', categoryId)
            .eq('isVisible', true);
        if (countError) {
            logger.error('Error counting products', { error: countError, categoryId });
            return;
        }
        const { error } = await supabaseAdmin
            .from('categories')
            .update({ product_count: count || 0 })
            .eq('category_id', categoryId);
        if (error) {
            logger.error('Error updating category product count', { error, categoryId });
        }
        this.invalidateCache();
    }
    invalidateCache() {
        deleteByPattern(CacheKeys.CATEGORIES);
    }
}
// Export singleton
export const categoryRepository = new CategoryRepository();
//# sourceMappingURL=category.repository.js.map