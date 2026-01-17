import { Prisma } from '../config/database.config';
import type { Review } from '@prisma/client';
export interface ReviewWithCustomer extends Omit<Review, 'review_id'> {
    review_id: number | bigint;
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
    findById(reviewId: bigint): Promise<Review | null>;
    /**
     * Get customer's review for a product
     */
    findByCustomerAndProduct(customerId: number, productId: number): Promise<Review | null>;
    /**
     * Add review
     */
    create(review: Prisma.ReviewCreateInput): Promise<Review>;
    /**
     * Add review with duplicate check
     */
    createWithCheck(customerId: number, productId: number, reviewData: {
        review?: string;
        rating?: number;
    }): Promise<Review>;
    /**
     * Update review
     */
    update(reviewId: bigint, updates: Prisma.ReviewUpdateInput): Promise<Review>;
    /**
     * Delete review
     */
    delete(reviewId: bigint): Promise<boolean>;
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
    findByCustomerId(customerId: number): Promise<Review[]>;
    /**
     * Check if review belongs to customer
     */
    belongsToCustomer(reviewId: bigint, customerId: number): Promise<boolean>;
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
    /**
     * Get reviews by minimum rating
     */
    findByMinRating(minRating: number, limit?: number): Promise<ReviewWithCustomer[]>;
    /**
     * Get happy customers statistics (rating > 4)
     */
    getHappyCustomersStats(): Promise<{
        count: number;
        averageRating: number;
    }>;
}
export declare const reviewRepository: ReviewRepository;
//# sourceMappingURL=review.repository.d.ts.map