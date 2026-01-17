"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRepository = exports.ReviewRepository = void 0;
const database_config_1 = require("../config/database.config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class ReviewRepository {
    /**
     * Get reviews for a product
     */
    async findByProductId(productId) {
        try {
            const reviews = await database_config_1.db.review.findMany({
                where: { product_id: productId },
                include: {
                    customer: {
                        select: { first_name: true, last_name: true },
                    },
                },
                orderBy: { sent_at: 'desc' },
            });
            return reviews.map((review) => ({
                ...review,
                review_id: Number(review.review_id), // Convert BigInt to Number
                customerName: review.customer
                    ? `${review.customer.first_name} ${review.customer.last_name || ''}`.trim()
                    : 'Anonymous',
            }));
        }
        catch (error) {
            logger_1.logger.error('Error fetching reviews', { error, productId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get review by ID
     */
    async findById(reviewId) {
        try {
            const review = await database_config_1.db.review.findUnique({
                where: { review_id: reviewId },
            });
            return review;
        }
        catch (error) {
            logger_1.logger.error('Error fetching review', { error, reviewId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get customer's review for a product
     */
    async findByCustomerAndProduct(customerId, productId) {
        try {
            const review = await database_config_1.db.review.findFirst({
                where: {
                    customer_id: customerId,
                    product_id: productId,
                },
            });
            return review;
        }
        catch (error) {
            logger_1.logger.error('Error fetching customer review', { error, customerId, productId });
            return null;
        }
    }
    /**
     * Add review
     */
    async create(review) {
        try {
            const newReview = await database_config_1.db.review.create({
                data: review,
            });
            return newReview;
        }
        catch (error) {
            logger_1.logger.error('Error creating review', { error });
            throw new errors_1.InternalServerError('Failed to create review');
        }
    }
    /**
     * Add review with duplicate check
     */
    async createWithCheck(customerId, productId, reviewData) {
        // Check if customer already reviewed this product
        const existing = await this.findByCustomerAndProduct(customerId, productId);
        if (existing) {
            throw new errors_1.ConflictError('You have already reviewed this product');
        }
        return this.create({
            customer: { connect: { customer_id: customerId } },
            product: { connect: { product_id: productId } },
            review: reviewData.review,
            rating: reviewData.rating,
        });
    }
    /**
     * Update review
     */
    async update(reviewId, updates) {
        try {
            const review = await database_config_1.db.review.update({
                where: { review_id: reviewId },
                data: updates,
            });
            return review;
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new errors_1.NotFoundError('Review not found');
            }
            logger_1.logger.error('Error updating review', { error, reviewId });
            throw new errors_1.InternalServerError('Failed to update review');
        }
    }
    /**
     * Delete review
     */
    async delete(reviewId) {
        try {
            await database_config_1.db.review.delete({
                where: { review_id: reviewId },
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting review', { error, reviewId });
            throw new errors_1.InternalServerError('Failed to delete review');
        }
    }
    /**
     * Get average rating for a product
     */
    async getAverageRating(productId) {
        try {
            const reviews = await database_config_1.db.review.findMany({
                where: { product_id: productId },
                select: { rating: true },
            });
            if (reviews.length === 0) {
                return { average: 0, count: 0 };
            }
            const validRatings = reviews.filter((r) => r.rating !== null);
            const sum = validRatings.reduce((acc, r) => acc + Number(r.rating || 0), 0);
            const average = validRatings.length > 0 ? sum / validRatings.length : 0;
            return {
                average: Math.round(average * 10) / 10,
                count: validRatings.length,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting average rating', { error, productId });
            return { average: 0, count: 0 };
        }
    }
    /**
     * Get reviews by customer
     */
    async findByCustomerId(customerId) {
        try {
            const reviews = await database_config_1.db.review.findMany({
                where: { customer_id: customerId },
                orderBy: { sent_at: 'desc' },
            });
            return reviews;
        }
        catch (error) {
            logger_1.logger.error('Error fetching customer reviews', { error, customerId });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Check if review belongs to customer
     */
    async belongsToCustomer(reviewId, customerId) {
        try {
            const review = await database_config_1.db.review.findFirst({
                where: {
                    review_id: reviewId,
                    customer_id: customerId,
                },
            });
            return !!review;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get all reviews (admin)
     */
    async findAll(params = {}) {
        const { page = 1, pageSize = 20, productId, customerId } = params;
        const offset = (page - 1) * pageSize;
        try {
            const where = {};
            if (productId)
                where.product_id = productId;
            if (customerId)
                where.customer_id = customerId;
            const [reviews, total] = await Promise.all([
                database_config_1.db.review.findMany({
                    where,
                    include: {
                        customer: {
                            select: { first_name: true, last_name: true },
                        },
                    },
                    orderBy: { sent_at: 'desc' },
                    skip: offset,
                    take: pageSize,
                }),
                database_config_1.db.review.count({ where }),
            ]);
            const reviewsWithCustomer = reviews.map((review) => ({
                ...review,
                review_id: Number(review.review_id), // Convert BigInt to Number
                customerName: review.customer
                    ? `${review.customer.first_name} ${review.customer.last_name || ''}`.trim()
                    : 'Anonymous',
            }));
            return { reviews: reviewsWithCustomer, total };
        }
        catch (error) {
            logger_1.logger.error('Error fetching all reviews', { error });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get reviews by minimum rating
     */
    async findByMinRating(minRating, limit = 10) {
        try {
            const reviews = await database_config_1.db.review.findMany({
                where: {
                    rating: {
                        gte: minRating,
                    },
                },
                include: {
                    customer: {
                        select: { first_name: true, last_name: true },
                    },
                },
                orderBy: { sent_at: 'desc' },
                take: limit,
            });
            return reviews.map((review) => ({
                ...review,
                review_id: Number(review.review_id), // Convert BigInt to Number
                customerName: review.customer
                    ? `${review.customer.first_name} ${review.customer.last_name || ''}`.trim()
                    : 'Anonymous',
            }));
        }
        catch (error) {
            logger_1.logger.error('Error fetching reviews by min rating', { error, minRating });
            throw new errors_1.InternalServerError('Database error');
        }
    }
    /**
     * Get happy customers statistics (rating > 4)
     */
    async getHappyCustomersStats() {
        try {
            const reviews = await database_config_1.db.review.findMany({
                where: {
                    rating: {
                        gt: 4,
                    },
                },
                select: { rating: true },
            });
            if (reviews.length === 0) {
                return { count: 0, averageRating: 0 };
            }
            const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
            const average = sum / reviews.length;
            return {
                count: reviews.length,
                averageRating: Math.round(average * 10) / 10,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting happy customers stats', { error });
            return { count: 0, averageRating: 0 };
        }
    }
}
exports.ReviewRepository = ReviewRepository;
// Export singleton
exports.reviewRepository = new ReviewRepository();
//# sourceMappingURL=review.repository.js.map