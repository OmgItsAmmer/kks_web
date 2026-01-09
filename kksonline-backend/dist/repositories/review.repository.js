import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { InternalServerError, NotFoundError, ConflictError } from '../utils/errors.js';
export class ReviewRepository {
    /**
     * Get reviews for a product
     */
    async findByProductId(productId) {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select(`
        *,
        customers(first_name, last_name)
      `)
            .eq('product_id', productId)
            .order('sent_at', { ascending: false });
        if (error) {
            logger.error('Error fetching reviews', { error, productId });
            throw new InternalServerError('Database error');
        }
        return (data || []).map((review) => {
            const customer = review.customers;
            return {
                ...review,
                customerName: customer
                    ? `${customer.first_name} ${customer.last_name || ''}`.trim()
                    : 'Anonymous',
            };
        });
    }
    /**
     * Get review by ID
     */
    async findById(reviewId) {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select('*')
            .eq('review_id', reviewId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching review', { error, reviewId });
            throw new InternalServerError('Database error');
        }
        return data;
    }
    /**
     * Get customer's review for a product
     */
    async findByCustomerAndProduct(customerId, productId) {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select('*')
            .eq('customer_id', customerId)
            .eq('product_id', productId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching customer review', { error, customerId, productId });
        }
        return data;
    }
    /**
     * Add review
     */
    async create(review) {
        // Check if customer already reviewed this product
        if (review.customer_id && review.product_id) {
            const existing = await this.findByCustomerAndProduct(review.customer_id, review.product_id);
            if (existing) {
                throw new ConflictError('You have already reviewed this product');
            }
        }
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .insert(review)
            .select()
            .single();
        if (error) {
            logger.error('Error creating review', { error });
            throw new InternalServerError('Failed to create review');
        }
        return data;
    }
    /**
     * Update review
     */
    async update(reviewId, updates) {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .update(updates)
            .eq('review_id', reviewId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Review not found');
            }
            logger.error('Error updating review', { error, reviewId });
            throw new InternalServerError('Failed to update review');
        }
        return data;
    }
    /**
     * Delete review
     */
    async delete(reviewId) {
        const { error } = await supabaseAdmin
            .from('reviews')
            .delete()
            .eq('review_id', reviewId);
        if (error) {
            logger.error('Error deleting review', { error, reviewId });
            throw new InternalServerError('Failed to delete review');
        }
        return true;
    }
    /**
     * Get average rating for a product
     */
    async getAverageRating(productId) {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select('rating')
            .eq('product_id', productId);
        if (error) {
            logger.error('Error getting average rating', { error, productId });
            return { average: 0, count: 0 };
        }
        if (!data || data.length === 0) {
            return { average: 0, count: 0 };
        }
        const validRatings = data.filter((r) => r.rating !== null);
        const sum = validRatings.reduce((acc, r) => acc + (r.rating || 0), 0);
        const average = validRatings.length > 0 ? sum / validRatings.length : 0;
        return {
            average: Math.round(average * 10) / 10, // Round to 1 decimal
            count: validRatings.length,
        };
    }
    /**
     * Get reviews by customer
     */
    async findByCustomerId(customerId) {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select('*')
            .eq('customer_id', customerId)
            .order('sent_at', { ascending: false });
        if (error) {
            logger.error('Error fetching customer reviews', { error, customerId });
            throw new InternalServerError('Database error');
        }
        return data || [];
    }
    /**
     * Check if review belongs to customer
     */
    async belongsToCustomer(reviewId, customerId) {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select('review_id')
            .eq('review_id', reviewId)
            .eq('customer_id', customerId)
            .single();
        return !error && !!data;
    }
    /**
     * Get all reviews (admin)
     */
    async findAll(params = {}) {
        const { page = 1, pageSize = 20, productId, customerId } = params;
        const offset = (page - 1) * pageSize;
        let query = supabaseAdmin
            .from('reviews')
            .select(`
        *,
        customers(first_name, last_name)
      `, { count: 'exact' });
        if (productId) {
            query = query.eq('product_id', productId);
        }
        if (customerId) {
            query = query.eq('customer_id', customerId);
        }
        const { data, error, count } = await query
            .order('sent_at', { ascending: false })
            .range(offset, offset + pageSize - 1);
        if (error) {
            logger.error('Error fetching all reviews', { error });
            throw new InternalServerError('Database error');
        }
        const reviews = (data || []).map((review) => {
            const customer = review.customers;
            return {
                ...review,
                customerName: customer
                    ? `${customer.first_name} ${customer.last_name || ''}`.trim()
                    : 'Anonymous',
            };
        });
        return {
            reviews,
            total: count || 0,
        };
    }
}
// Export singleton
export const reviewRepository = new ReviewRepository();
//# sourceMappingURL=review.repository.js.map