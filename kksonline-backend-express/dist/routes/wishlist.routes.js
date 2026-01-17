"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const wishlist_repository_1 = require("../repositories/wishlist.repository");
const image_service_1 = require("../services/image.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const customer_middleware_1 = require("../middleware/customer.middleware");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
// All wishlist routes require customer identification
router.use(customer_middleware_1.requireCustomer);
/**
 * @route   GET /api/v1/wishlist
 * @desc    Get wishlist items
 * @access  Private
 */
router.get('/', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const items = await wishlist_repository_1.wishlistRepository.findWithProductDetails(req.customerId);
    // Fetch images for products
    const productIds = items.map((item) => item.productId);
    const images = await image_service_1.imageService.getMainImagesForEntities(productIds, 'products');
    const itemsWithImages = items.map((item) => ({
        ...item,
        imageUrl: images.get(item.productId) || null,
    }));
    return (0, response_1.sendSuccess)(res, itemsWithImages);
}));
/**
 * @route   POST /api/v1/wishlist
 * @desc    Add product to wishlist
 * @access  Private
 */
router.post('/', (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.wishlist }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const { productId } = req.body;
    const item = await wishlist_repository_1.wishlistRepository.add(req.customerId, productId);
    return (0, response_1.sendCreated)(res, item, 'Added to wishlist');
}));
/**
 * @route   DELETE /api/v1/wishlist/:productId
 * @desc    Remove product from wishlist
 * @access  Private
 */
router.delete('/:productId', (0, validation_middleware_1.validate)({ params: zod_1.z.object({ productId: zod_1.z.string().transform(Number) }) }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const productId = parseInt(req.params.productId, 10);
    await wishlist_repository_1.wishlistRepository.remove(req.customerId, productId);
    return (0, response_1.sendNoContent)(res);
}));
/**
 * @route   GET /api/v1/wishlist/check/:productId
 * @desc    Check if product is in wishlist
 * @access  Private
 */
router.get('/check/:productId', (0, validation_middleware_1.validate)({ params: zod_1.z.object({ productId: zod_1.z.string().transform(Number) }) }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const productId = parseInt(req.params.productId, 10);
    const isInWishlist = await wishlist_repository_1.wishlistRepository.isInWishlist(req.customerId, productId);
    return (0, response_1.sendSuccess)(res, { isInWishlist });
}));
/**
 * @route   GET /api/v1/wishlist/count
 * @desc    Get wishlist count
 * @access  Private
 */
router.get('/count', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    const count = await wishlist_repository_1.wishlistRepository.getCount(req.customerId);
    return (0, response_1.sendSuccess)(res, { count });
}));
/**
 * @route   DELETE /api/v1/wishlist
 * @desc    Clear wishlist
 * @access  Private
 */
router.delete('/', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_1.sendError)(res, 'Unauthorized', 401);
    }
    await wishlist_repository_1.wishlistRepository.clear(req.customerId);
    return (0, response_1.sendNoContent)(res);
}));
exports.default = router;
//# sourceMappingURL=wishlist.routes.js.map