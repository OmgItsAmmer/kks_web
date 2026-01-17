"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const review_repository_1 = require("../repositories/review.repository");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const customer_middleware_1 = require("../middleware/customer.middleware");
const response_1 = require("../utils/response");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/reviews
 * @desc    Add a review
 * @access  Private
 */
router.post('/', customer_middleware_1.requireCustomer, (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.review }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const { productId, rating, review } = req.body;
    const newReview = await review_repository_1.reviewRepository.create({
        product: { connect: { product_id: productId } },
        customer: { connect: { customer_id: req.customerId } },
        rating,
        review: review || '',
    });
    return (0, response_1.sendCreated)(res, newReview, 'Review submitted successfully');
}));
/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update a review
 * @access  Private
 */
router.put('/:id', customer_middleware_1.requireCustomer, (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: zod_1.z.object({
        rating: zod_1.z.number().min(1).max(5).optional(),
        review: zod_1.z.string().max(1000).optional(),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const reviewId = BigInt(req.params.id);
    // Verify ownership
    const belongs = await review_repository_1.reviewRepository.belongsToCustomer(reviewId, req.customerId);
    if (!belongs) {
        throw new errors_1.ForbiddenError('Access denied to this review');
    }
    const { rating, review } = req.body;
    const updates = {};
    if (rating !== undefined)
        updates.rating = rating;
    if (review !== undefined)
        updates.review = review;
    const updated = await review_repository_1.reviewRepository.update(reviewId, updates);
    return (0, response_1.sendSuccess)(res, updated, 'Review updated successfully');
}));
/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete a review
 * @access  Private
 */
router.delete('/:id', customer_middleware_1.requireCustomer, (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const reviewId = BigInt(req.params.id);
    // Verify ownership
    const belongs = await review_repository_1.reviewRepository.belongsToCustomer(reviewId, req.customerId);
    if (!belongs) {
        throw new errors_1.ForbiddenError('Access denied to this review');
    }
    await review_repository_1.reviewRepository.delete(reviewId);
    return (0, response_1.sendNoContent)(res);
}));
/**
 * @route   GET /api/v1/reviews/my
 * @desc    Get current customer's reviews
 * @access  Private
 */
router.get('/my', customer_middleware_1.requireCustomer, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const reviews = await review_repository_1.reviewRepository.findByCustomerId(req.customerId);
    return (0, response_1.sendSuccess)(res, reviews);
}));
/**
 * @route   GET /api/v1/reviews/filter
 * @desc    Get reviews by rating filter
 * @access  Public
 */
router.get('/filter', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const minRating = parseFloat(req.query.minRating) || 0;
    const limit = parseInt(req.query.limit, 10) || 10;
    const reviews = await review_repository_1.reviewRepository.findByMinRating(minRating, limit);
    return (0, response_1.sendSuccess)(res, reviews);
}));
/**
 * @route   GET /api/v1/reviews/stats/happy
 * @desc    Get happy customers statistics (rating > 4)
 * @access  Public
 */
router.get('/stats/happy', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const stats = await review_repository_1.reviewRepository.getHappyCustomersStats();
    return (0, response_1.sendSuccess)(res, stats);
}));
exports.default = router;
//# sourceMappingURL=review.routes.js.map