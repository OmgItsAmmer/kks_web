import { supabaseAdmin } from "../config/supabase.config.js";
import { logger } from "../utils/logger.js";
import { InternalServerError, NotFoundError } from "../utils/errors.js";
import { CacheKeys, withCache, deleteByPattern } from "../utils/cache.js";
export class BrandRepository {
    /**
     * Get all brands
     */
    async findAll() {
        return withCache(CacheKeys.BRANDS, async () => {
            const { data, error } = await supabaseAdmin
                .from('brands')
                .select('*')
                .order('brandname', { ascending: true });
            if (error) {
                logger.error('Error fetching brands', { error });
                throw new InternalServerError('Database error');
            }
            return data || [];
        });
    }
    /**
     * Get featured brands
     */
    async findFeatured() {
        return withCache(`${CacheKeys.BRANDS}_featured`, async () => {
            const { data, error } = await supabaseAdmin
                .from('brands')
                .select('*')
                .eq('isFeatured', true)
                .order('brandname', { ascending: true });
            if (error) {
                logger.error('Error fetching featured brands', { error });
                throw new InternalServerError('Database error');
            }
            return data || [];
        });
    }
    /**
     * Get verified brands
     */
    async findVerified() {
        return withCache(`${CacheKeys.BRANDS}_verified`, async () => {
            const { data, error } = await supabaseAdmin
                .from('brands')
                .select('*')
                .eq('isVerified', true)
                .order('brandname', { ascending: true });
            if (error) {
                logger.error('Error fetching verified brands', { error });
                throw new InternalServerError('Database error');
            }
            return data || [];
        });
    }
    /**
     * Get brand by ID
     */
    async findById(brandId) {
        const { data, error } = await supabaseAdmin
            .from('brands')
            .select('*')
            .eq('brandID', brandId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching brand', { error, brandId });
            throw new InternalServerError('Database error');
        }
        return data;
    }
    /**
     * Create brand (admin)
     */
    async create(brand) {
        const { data, error } = await supabaseAdmin
            .from('brands')
            .insert(brand)
            .select()
            .single();
        if (error) {
            logger.error('Error creating brand', { error });
            throw new InternalServerError('Failed to create brand');
        }
        this.invalidateCache();
        return data;
    }
    /**
     * Update brand (admin)
     */
    async update(brandId, updates) {
        const { data, error } = await supabaseAdmin
            .from('brands')
            .update(updates)
            .eq('brandID', brandId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Brand not found');
            }
            logger.error('Error updating brand', { error, brandId });
            throw new InternalServerError('Failed to update brand');
        }
        this.invalidateCache();
        return data;
    }
    /**
     * Delete brand (admin)
     */
    async delete(brandId) {
        const { error } = await supabaseAdmin
            .from('brands')
            .delete()
            .eq('brandID', brandId);
        if (error) {
            logger.error('Error deleting brand', { error, brandId });
            throw new InternalServerError('Failed to delete brand');
        }
        this.invalidateCache();
        return true;
    }
    /**
     * Update product count for a brand
     */
    async updateProductCount(brandId) {
        const { count, error: countError } = await supabaseAdmin
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('brandID', brandId)
            .eq('isVisible', true);
        if (countError) {
            logger.error('Error counting brand products', { error: countError, brandId });
            return;
        }
        const { error } = await supabaseAdmin
            .from('brands')
            .update({ product_count: count || 0 })
            .eq('brandID', brandId);
        if (error) {
            logger.error('Error updating brand product count', { error, brandId });
        }
        this.invalidateCache();
    }
    invalidateCache() {
        deleteByPattern(CacheKeys.BRANDS);
    }
}
// Export singleton
export const brandRepository = new BrandRepository();
//# sourceMappingURL=brand.repository.js.map