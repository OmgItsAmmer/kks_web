import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { InternalServerError, ConflictError } from '../utils/errors.js';
export class WishlistRepository {
    /**
     * Get wishlist items for a customer
     */
    async findByCustomerId(customerId) {
        const { data, error } = await supabaseAdmin
            .from('wishlist')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
        if (error) {
            logger.error('Error fetching wishlist', { error, customerId });
            throw new InternalServerError('Database error');
        }
        return data || [];
    }
    /**
     * Get wishlist with product details
     */
    async findWithProductDetails(customerId) {
        const { data, error } = await supabaseAdmin
            .from('wishlist')
            .select(`
        wishlist_id,
        created_at,
        product_id,
        products(name, sale_price, base_price, isVisible)
      `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
        if (error) {
            logger.error('Error fetching wishlist with details', { error, customerId });
            throw new InternalServerError('Database error');
        }
        return (data || [])
            .filter((item) => {
            const product = item.products;
            return product?.isVisible !== false;
        })
            .map((item) => {
            const product = item.products;
            return {
                wishlistId: item.wishlist_id,
                productId: item.product_id,
                productName: product?.name || 'Unknown',
                salePrice: product?.sale_price || null,
                basePrice: product?.base_price || null,
                createdAt: item.created_at,
            };
        });
    }
    /**
     * Add item to wishlist
     */
    async add(customerId, productId) {
        // Check if already in wishlist
        const existing = await this.findByCustomerAndProduct(customerId, productId);
        if (existing) {
            throw new ConflictError('Product already in wishlist');
        }
        const { data, error } = await supabaseAdmin
            .from('wishlist')
            .insert({
            customer_id: customerId,
            product_id: productId,
        })
            .select()
            .single();
        if (error) {
            logger.error('Error adding to wishlist', { error, customerId, productId });
            throw new InternalServerError('Failed to add to wishlist');
        }
        return data;
    }
    /**
     * Remove item from wishlist
     */
    async remove(customerId, productId) {
        const { error } = await supabaseAdmin
            .from('wishlist')
            .delete()
            .eq('customer_id', customerId)
            .eq('product_id', productId);
        if (error) {
            logger.error('Error removing from wishlist', { error, customerId, productId });
            throw new InternalServerError('Failed to remove from wishlist');
        }
        return true;
    }
    /**
     * Remove by wishlist ID
     */
    async removeById(wishlistId) {
        const { error } = await supabaseAdmin
            .from('wishlist')
            .delete()
            .eq('wishlist_id', wishlistId);
        if (error) {
            logger.error('Error removing wishlist item', { error, wishlistId });
            throw new InternalServerError('Failed to remove from wishlist');
        }
        return true;
    }
    /**
     * Check if product is in wishlist
     */
    async isInWishlist(customerId, productId) {
        const item = await this.findByCustomerAndProduct(customerId, productId);
        return item !== null;
    }
    /**
     * Get wishlist item by customer and product
     */
    async findByCustomerAndProduct(customerId, productId) {
        const { data, error } = await supabaseAdmin
            .from('wishlist')
            .select('*')
            .eq('customer_id', customerId)
            .eq('product_id', productId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error checking wishlist', { error, customerId, productId });
        }
        return data;
    }
    /**
     * Get wishlist count
     */
    async getCount(customerId) {
        const { count, error } = await supabaseAdmin
            .from('wishlist')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error getting wishlist count', { error, customerId });
            return 0;
        }
        return count || 0;
    }
    /**
     * Clear wishlist
     */
    async clear(customerId) {
        const { error } = await supabaseAdmin
            .from('wishlist')
            .delete()
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error clearing wishlist', { error, customerId });
            throw new InternalServerError('Failed to clear wishlist');
        }
        return true;
    }
    /**
     * Check if wishlist item belongs to customer
     */
    async belongsToCustomer(wishlistId, customerId) {
        const { data, error } = await supabaseAdmin
            .from('wishlist')
            .select('wishlist_id')
            .eq('wishlist_id', wishlistId)
            .eq('customer_id', customerId)
            .single();
        return !error && !!data;
    }
}
// Export singleton
export const wishlistRepository = new WishlistRepository();
//# sourceMappingURL=wishlist.repository.js.map