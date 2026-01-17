import { Router, type Response } from 'express';
import { z } from 'zod';
import { reviewRepository } from '../repositories/review.repository';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { requireCustomer } from '../middleware/customer.middleware';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/response';
import { ForbiddenError } from '../utils/errors';
import type { CustomerRequest } from '../types/api.types';

const router = Router();

/**
 * @route   POST /api/v1/reviews
 * @desc    Add a review
 * @access  Private
 */
router.post(
  '/',
  requireCustomer,
  validate({ body: schemas.review }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { productId, rating, review } = req.body;

    const newReview = await reviewRepository.create({
      product: { connect: { product_id: productId } },
      customer: { connect: { customer_id: req.customerId } },
      rating,
      review: review || '',
    });

    return sendCreated(res, newReview, 'Review submitted successfully');
  })
);

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update a review
 * @access  Private
 */
router.put(
  '/:id',
  requireCustomer,
  validate({
    params: schemas.idParam,
    body: z.object({
      rating: z.number().min(1).max(5).optional(),
      review: z.string().max(1000).optional(),
    }),
  }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const reviewId = BigInt(req.params.id!);

    // Verify ownership
    const belongs = await reviewRepository.belongsToCustomer(reviewId, req.customerId);
    if (!belongs) {
      throw new ForbiddenError('Access denied to this review');
    }

    const { rating, review } = req.body;

    const updates: Record<string, unknown> = {};
    if (rating !== undefined) updates.rating = rating;
    if (review !== undefined) updates.review = review;

    const updated = await reviewRepository.update(reviewId, updates);

    return sendSuccess(res, updated, 'Review updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete a review
 * @access  Private
 */
router.delete(
  '/:id',
  requireCustomer,
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const reviewId = BigInt(req.params.id!);

    // Verify ownership
    const belongs = await reviewRepository.belongsToCustomer(reviewId, req.customerId);
    if (!belongs) {
      throw new ForbiddenError('Access denied to this review');
    }

    await reviewRepository.delete(reviewId);

    return sendNoContent(res);
  })
);

/**
 * @route   GET /api/v1/reviews/my
 * @desc    Get current customer's reviews
 * @access  Private
 */
router.get(
  '/my',
  requireCustomer,
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const reviews = await reviewRepository.findByCustomerId(req.customerId);

    return sendSuccess(res, reviews);
  })
);

/**
 * @route   GET /api/v1/reviews/filter
 * @desc    Get reviews by rating filter
 * @access  Public
 */
router.get(
  '/filter',
  asyncHandler(async (req, res: Response) => {
    const minRating = parseFloat(req.query.minRating as string) || 0;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const reviews = await reviewRepository.findByMinRating(minRating, limit);

    return sendSuccess(res, reviews);
  })
);

/**
 * @route   GET /api/v1/reviews/stats/happy
 * @desc    Get happy customers statistics (rating > 4)
 * @access  Public
 */
router.get(
  '/stats/happy',
  asyncHandler(async (req, res: Response) => {
    const stats = await reviewRepository.getHappyCustomersStats();

    return sendSuccess(res, stats);
  })
);

export default router;
