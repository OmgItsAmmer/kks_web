import { Router } from 'express';
import { z } from 'zod';
import { wishlistRepository } from '../repositories/wishlist.repository.js';
import { imageService } from '../services/image.service.js';
import { validate, schemas } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/response.js';
const router = Router();
// All wishlist routes require authentication
router.use(authenticate);
/**
 * @route   GET /api/v1/wishlist
 * @desc    Get wishlist items
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    const items = await wishlistRepository.findWithProductDetails(req.customerId);
    // Fetch images for products
    const productIds = items.map((item) => item.productId);
    const images = await imageService.getMainImagesForEntities(productIds, 'products');
    const itemsWithImages = items.map((item) => ({
        ...item,
        imageUrl: images.get(item.productId) || null,
    }));
    return sendSuccess(res, itemsWithImages);
}));
/**
 * @route   POST /api/v1/wishlist
 * @desc    Add product to wishlist
 * @access  Private
 */
router.post('/', validate({ body: schemas.wishlist }), asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    const { productId } = req.body;
    const item = await wishlistRepository.add(req.customerId, productId);
    return sendCreated(res, item, 'Added to wishlist');
}));
/**
 * @route   DELETE /api/v1/wishlist/:productId
 * @desc    Remove product from wishlist
 * @access  Private
 */
router.delete('/:productId', validate({ params: z.object({ productId: z.string().transform(Number) }) }), asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    const productId = parseInt(req.params.productId, 10);
    await wishlistRepository.remove(req.customerId, productId);
    return sendNoContent(res);
}));
/**
 * @route   GET /api/v1/wishlist/check/:productId
 * @desc    Check if product is in wishlist
 * @access  Private
 */
router.get('/check/:productId', validate({ params: z.object({ productId: z.string().transform(Number) }) }), asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    const productId = parseInt(req.params.productId, 10);
    const isInWishlist = await wishlistRepository.isInWishlist(req.customerId, productId);
    return sendSuccess(res, { isInWishlist });
}));
/**
 * @route   GET /api/v1/wishlist/count
 * @desc    Get wishlist count
 * @access  Private
 */
router.get('/count', asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    const count = await wishlistRepository.getCount(req.customerId);
    return sendSuccess(res, { count });
}));
/**
 * @route   DELETE /api/v1/wishlist
 * @desc    Clear wishlist
 * @access  Private
 */
router.delete('/', asyncHandler(async (req, res) => {
    if (!req.customerId) {
        return sendError(res, 'Unauthorized', 401);
    }
    await wishlistRepository.clear(req.customerId);
    return sendNoContent(res);
}));
export default router;
//# sourceMappingURL=wishlist.routes.js.map