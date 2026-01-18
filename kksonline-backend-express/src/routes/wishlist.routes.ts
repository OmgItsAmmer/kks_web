import { Router, type Response } from 'express';
import { z } from 'zod';
import { wishlistRepository } from '../repositories/wishlist.repository';
import { supabaseImageService } from '../services/supabase-image.service';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { requireCustomer } from '../middleware/customer.middleware';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/response';
import type { CustomerRequest } from '../types/api.types';

const router = Router();

// All wishlist routes require customer identification
router.use(requireCustomer);

/**
 * @route   GET /api/v1/wishlist
 * @desc    Get wishlist items
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const items = await wishlistRepository.findWithProductDetails(req.customerId);

    // Fetch images for products from Supabase storage (matching product routes)
    const productIds = items.map((item) => item.productId);
    const images = await supabaseImageService.getMainImagesForEntities(productIds, 'products');

    const itemsWithImages = items.map((item) => ({
      ...item,
      imageUrl: images.get(item.productId) || null,
    }));

    return sendSuccess(res, itemsWithImages);
  })
);

/**
 * @route   POST /api/v1/wishlist
 * @desc    Add product to wishlist
 * @access  Private
 */
router.post(
  '/',
  validate({ body: schemas.wishlist }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { productId } = req.body;

    const item = await wishlistRepository.add(req.customerId, productId);

    return sendCreated(res, item, 'Added to wishlist');
  })
);

/**
 * @route   DELETE /api/v1/wishlist/:productId
 * @desc    Remove product from wishlist
 * @access  Private
 */
router.delete(
  '/:productId',
  validate({ params: z.object({ productId: z.string().transform(Number) }) }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const productId = parseInt(req.params.productId!, 10);

    await wishlistRepository.remove(req.customerId, productId);

    return sendNoContent(res);
  })
);

/**
 * @route   GET /api/v1/wishlist/check/:productId
 * @desc    Check if product is in wishlist
 * @access  Private
 */
router.get(
  '/check/:productId',
  validate({ params: z.object({ productId: z.string().transform(Number) }) }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const productId = parseInt(req.params.productId!, 10);

    const isInWishlist = await wishlistRepository.isInWishlist(req.customerId, productId);

    return sendSuccess(res, { isInWishlist });
  })
);

/**
 * @route   GET /api/v1/wishlist/count
 * @desc    Get wishlist count
 * @access  Private
 */
router.get(
  '/count',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const count = await wishlistRepository.getCount(req.customerId);

    return sendSuccess(res, { count });
  })
);

/**
 * @route   DELETE /api/v1/wishlist
 * @desc    Clear wishlist
 * @access  Private
 */
router.delete(
  '/',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    await wishlistRepository.clear(req.customerId);

    return sendNoContent(res);
  })
);

export default router;
