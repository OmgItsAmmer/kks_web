import { Router } from 'express';
import { z } from 'zod';
import { reviewRepository } from '../repositories/review.repository.js';
import { validate, schemas } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/response.js';
import { ForbiddenError } from '../utils/errors.js';
const router = Router();
/**
 * @route   POST /api/v1/reviews
 * @desc    Add a review
 * @access  Private
 */
router.post('/', authenticate, validate({ body: schemas.review }), asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    const { productId, rating, review } = req.body;
    const newReview = await reviewRepository.create({
        product_id: productId,
        customer_id: req.customerId,
        rating,
        review: review || '',
    });
    return sendCreated(res, newReview, 'Review submitted successfully');
}));
/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update a review
 * @access  Private
 */
router.put('/:id', authenticate, validate({
    params: schemas.idParam,
    body: z.object({
        rating: z.number().min(1).max(5).optional(),
        review: z.string().max(1000).optional(),
    }),
}), asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    const reviewId = parseInt(req.params.id, 10);
    // Verify ownership
    const belongs = await reviewRepository.belongsToCustomer(reviewId, req.customerId);
    if (!belongs) {
        throw new ForbiddenError('Access denied to this review');
    }
    const { rating, review } = req.body;
    const updates = {};
    if (rating !== undefined)
        updates.rating = rating;
    if (review !== undefined)
        updates.review = review;
    const updated = await reviewRepository.update(reviewId, updates);
    return sendSuccess(res, updated, 'Review updated successfully');
}));
/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete a review
 * @access  Private
 */
router.delete('/:id', authenticate, validate({ params: schemas.idParam }), asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    const reviewId = parseInt(req.params.id, 10);
    // Verify ownership
    const belongs = await reviewRepository.belongsToCustomer(reviewId, req.customerId);
    if (!belongs) {
        throw new ForbiddenError('Access denied to this review');
    }
    await reviewRepository.delete(reviewId);
    return sendNoContent(res);
}));
/**
 * @route   GET /api/v1/reviews/my
 * @desc    Get current customer's reviews
 * @access  Private
 */
router.get('/my', authenticate, asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    const reviews = await reviewRepository.findByCustomerId(req.customerId);
    return sendSuccess(res, reviews);
}));
export default router;
//# sourceMappingURL=review.routes.js.map