import { Router, type Response } from 'express';
import { z } from 'zod';
import { cartRepository } from '../repositories/cart.repository';
import { imageService } from '../services/image.service';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { requireCustomer } from '../middleware/customer.middleware';
import { sendSuccess, sendError, sendCreated, sendNoContent } from '../utils/response';
import type { CustomerRequest } from '../types/api.types';

const router = Router();

// All cart routes require customer identification
router.use(requireCustomer);

/**
 * @route   GET /api/v1/cart
 * @desc    Get cart items with full details
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const items = await cartRepository.findWithDetails(req.customerId);

    // Fetch images for products
    const productIds = [...new Set(items.map((item) => item.productId))];
    const images = await imageService.getMainImagesForEntities(productIds, 'products');

    const itemsWithImages = items.map((item) => ({
      ...item,
      imageUrl: images.get(item.productId) || null,
    }));

    // Calculate totals
    const { subtotal, itemCount } = await cartRepository.getCartTotal(req.customerId);

    return sendSuccess(res, {
      items: itemsWithImages,
      subtotal,
      itemCount,
    });
  })
);

/**
 * @route   POST /api/v1/cart
 * @desc    Add item to cart
 * @access  Private
 */
router.post(
  '/',
  validate({ body: schemas.cartItem }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { variantId, quantity } = req.body;

    // Check shop limit
    const limitCheck = await cartRepository.checkShopLimit(req.customerId, variantId, quantity);
    if (!limitCheck.allowed) {
      return sendError(
        res,
        `Cannot add ${quantity} items. Maximum allowed: ${limitCheck.maxAllowedQuantity}, ` +
        `Current in cart: ${limitCheck.currentQuantity}, You can add: ${limitCheck.remainingQuantity}`,
        400,
        'SHOP_LIMIT_EXCEEDED' as const
      );
    }

    // Check stock availability
    const canAdd = await cartRepository.canAddToCart(variantId, quantity);
    if (!canAdd) {
      return sendError(res, 'Insufficient stock for this item', 400, 'INSUFFICIENT_STOCK' as const);
    }

    const item = await cartRepository.addItem(req.customerId, variantId, quantity);

    return sendCreated(res, item, 'Item added to cart');
  })
);

/**
 * @route   PUT /api/v1/cart/:cartId
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put(
  '/:cartId',
  validate({
    params: z.object({ cartId: z.string().transform(Number) }),
    body: schemas.cartUpdate,
  }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const cartId = parseInt(req.params.cartId!, 10);
    const { quantity } = req.body;

    try {
      const item = await cartRepository.updateQuantity(cartId, quantity);
      return sendSuccess(res, item, 'Cart updated');
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Item removed from cart') {
        return sendSuccess(res, null, 'Item removed from cart');
      }
      throw error;
    }
  })
);

/**
 * @route   DELETE /api/v1/cart/:cartId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete(
  '/:cartId',
  validate({ params: z.object({ cartId: z.string().transform(Number) }) }),
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const cartId = parseInt(req.params.cartId!, 10);

    await cartRepository.removeItem(cartId);

    return sendNoContent(res);
  })
);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete(
  '/',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    await cartRepository.clearCart(req.customerId);

    return sendNoContent(res);
  })
);

/**
 * @route   POST /api/v1/cart/validate
 * @desc    Validate cart stock and get adjustments
 * @access  Private
 */
router.post(
  '/validate',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const validations = await cartRepository.validateCartStock(req.customerId);

    const hasIssues = validations.some((v) => !v.isValid);

    return sendSuccess(res, {
      valid: !hasIssues,
      adjustments: validations,
    });
  })
);

/**
 * @route   POST /api/v1/cart/apply-adjustments
 * @desc    Apply cart stock adjustments
 * @access  Private
 */
router.post(
  '/apply-adjustments',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { adjustments } = req.body;

    if (!Array.isArray(adjustments)) {
      return sendError(res, 'Adjustments array required', 400);
    }

    const success = await cartRepository.applyCartAdjustments(req.customerId, adjustments);

    if (success) {
      return sendSuccess(res, null, 'Cart adjustments applied');
    } else {
      return sendError(res, 'Failed to apply adjustments', 500);
    }
  })
);

/**
 * @route   GET /api/v1/cart/count
 * @desc    Get cart item count
 * @access  Private
 */
router.get(
  '/count',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const count = await cartRepository.getItemCount(req.customerId);

    return sendSuccess(res, { count });
  })
);

/**
 * @route   POST /api/v1/cart/transfer-to-kiosk
 * @desc    Transfer cart to kiosk for in-store checkout
 * @access  Private
 */
router.post(
  '/transfer-to-kiosk',
  asyncHandler(async (req: CustomerRequest, res: Response) => {
    if (!req.customerId) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { kioskSessionId } = req.body;

    if (!kioskSessionId) {
      return sendError(res, 'Kiosk session ID required', 400);
    }

    const success = await cartRepository.transferToKiosk(req.customerId, kioskSessionId);

    if (success) {
      return sendSuccess(res, null, 'Cart transferred to kiosk');
    } else {
      return sendError(res, 'Failed to transfer cart', 500);
    }
  })
);

export default router;
