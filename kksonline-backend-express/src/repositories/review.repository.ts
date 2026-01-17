import { db, Prisma } from '../config/database.config';
import { logger } from '../utils/logger';
import { InternalServerError, NotFoundError, ConflictError } from '../utils/errors';
import type { Review } from '@prisma/client';

export interface ReviewWithCustomer extends Omit<Review, 'review_id'> {
  review_id: number | bigint;
  customerName?: string;
}

export class ReviewRepository {
  /**
   * Get reviews for a product
   */
  async findByProductId(productId: number): Promise<ReviewWithCustomer[]> {
    try {
      const reviews = await db.review.findMany({
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
    } catch (error) {
      logger.error('Error fetching reviews', { error, productId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get review by ID
   */
  async findById(reviewId: bigint): Promise<Review | null> {
    try {
      const review = await db.review.findUnique({
        where: { review_id: reviewId },
      });
      return review;
    } catch (error) {
      logger.error('Error fetching review', { error, reviewId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get customer's review for a product
   */
  async findByCustomerAndProduct(customerId: number, productId: number): Promise<Review | null> {
    try {
      const review = await db.review.findFirst({
        where: {
          customer_id: customerId,
          product_id: productId,
        },
      });
      return review;
    } catch (error) {
      logger.error('Error fetching customer review', { error, customerId, productId });
      return null;
    }
  }

  /**
   * Add review
   */
  async create(review: Prisma.ReviewCreateInput): Promise<Review> {
    try {
      const newReview = await db.review.create({
        data: review,
      });
      return newReview;
    } catch (error) {
      logger.error('Error creating review', { error });
      throw new InternalServerError('Failed to create review');
    }
  }

  /**
   * Add review with duplicate check
   */
  async createWithCheck(customerId: number, productId: number, reviewData: {
    review?: string;
    rating?: number;
  }): Promise<Review> {
    // Check if customer already reviewed this product
    const existing = await this.findByCustomerAndProduct(customerId, productId);
    if (existing) {
      throw new ConflictError('You have already reviewed this product');
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
  async update(reviewId: bigint, updates: Prisma.ReviewUpdateInput): Promise<Review> {
    try {
      const review = await db.review.update({
        where: { review_id: reviewId },
        data: updates,
      });
      return review;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Review not found');
      }
      logger.error('Error updating review', { error, reviewId });
      throw new InternalServerError('Failed to update review');
    }
  }

  /**
   * Delete review
   */
  async delete(reviewId: bigint): Promise<boolean> {
    try {
      await db.review.delete({
        where: { review_id: reviewId },
      });
      return true;
    } catch (error) {
      logger.error('Error deleting review', { error, reviewId });
      throw new InternalServerError('Failed to delete review');
    }
  }

  /**
   * Get average rating for a product
   */
  async getAverageRating(productId: number): Promise<{ average: number; count: number }> {
    try {
      const reviews = await db.review.findMany({
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
    } catch (error) {
      logger.error('Error getting average rating', { error, productId });
      return { average: 0, count: 0 };
    }
  }

  /**
   * Get reviews by customer
   */
  async findByCustomerId(customerId: number): Promise<Review[]> {
    try {
      const reviews = await db.review.findMany({
        where: { customer_id: customerId },
        orderBy: { sent_at: 'desc' },
      });
      return reviews;
    } catch (error) {
      logger.error('Error fetching customer reviews', { error, customerId });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Check if review belongs to customer
   */
  async belongsToCustomer(reviewId: bigint, customerId: number): Promise<boolean> {
    try {
      const review = await db.review.findFirst({
        where: {
          review_id: reviewId,
          customer_id: customerId,
        },
      });
      return !!review;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all reviews (admin)
   */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    productId?: number;
    customerId?: number;
  } = {}): Promise<{ reviews: ReviewWithCustomer[]; total: number }> {
    const { page = 1, pageSize = 20, productId, customerId } = params;
    const offset = (page - 1) * pageSize;

    try {
      const where: Prisma.ReviewWhereInput = {};
      if (productId) where.product_id = productId;
      if (customerId) where.customer_id = customerId;

      const [reviews, total] = await Promise.all([
        db.review.findMany({
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
        db.review.count({ where }),
      ]);

      const reviewsWithCustomer = reviews.map((review) => ({
        ...review,
        review_id: Number(review.review_id), // Convert BigInt to Number
        customerName: review.customer
          ? `${review.customer.first_name} ${review.customer.last_name || ''}`.trim()
          : 'Anonymous',
      }));

      return { reviews: reviewsWithCustomer, total };
    } catch (error) {
      logger.error('Error fetching all reviews', { error });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get reviews by minimum rating
   */
  async findByMinRating(minRating: number, limit = 10): Promise<ReviewWithCustomer[]> {
    try {
      const reviews = await db.review.findMany({
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
    } catch (error) {
      logger.error('Error fetching reviews by min rating', { error, minRating });
      throw new InternalServerError('Database error');
    }
  }

  /**
   * Get happy customers statistics (rating > 4)
   */
  async getHappyCustomersStats(): Promise<{ count: number; averageRating: number }> {
    try {
      const reviews = await db.review.findMany({
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
    } catch (error) {
      logger.error('Error getting happy customers stats', { error });
      return { count: 0, averageRating: 0 };
    }
  }
}

// Export singleton
export const reviewRepository = new ReviewRepository();
