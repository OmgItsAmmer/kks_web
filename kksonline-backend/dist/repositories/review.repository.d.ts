import type { Tables, InsertTables, UpdateTables } from '../types/database.types.js';
export interface ReviewWithCustomer extends Tables<'reviews'> {
    customerName?: string;
}
export declare class ReviewRepository {
    /**
     * Get reviews for a product
     */
    findByProductId(productId: number): Promise<ReviewWithCustomer[]>;
    /**
     * Get review by ID
     */
    findById(reviewId: number): Promise<Tables<'reviews'> | null>;
    /**
     * Get customer's review for a product
     */
    findByCustomerAndProduct(customerId: number, productId: number): Promise<Tables<'reviews'> | null>;
    /**
     * Add review
     */
    create(review: InsertTables<'reviews'>): Promise<Tables<'reviews'>>;
    /**
     * Update review
     */
    update(reviewId: number, updates: UpdateTables<'reviews'>): Promise<Tables<'reviews'>>;
    /**
     * Delete review
     */
    delete(reviewId: number): Promise<boolean>;
    /**
     * Get average rating for a product
     */
    getAverageRating(productId: number): Promise<{
        average: number;
        count: number;
    }>;
    /**
     * Get reviews by customer
     */
    findByCustomerId(customerId: number): Promise<Tables<'reviews'>[]>;
    /**
     * Check if review belongs to customer
     */
    belongsToCustomer(reviewId: number, customerId: number): Promise<boolean>;
    /**
     * Get all reviews (admin)
     */
    findAll(params?: {
        page?: number;
        pageSize?: number;
        productId?: number;
        customerId?: number;
    }): Promise<{
        reviews: ReviewWithCustomer[];
        total: number;
    }>;
}
export declare const reviewRepository: ReviewRepository;
//# sourceMappingURL=review.repository.d.ts.map