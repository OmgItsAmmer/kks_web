"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const cart_repository_ts_1 = require("../repositories/cart.repository.ts");
const image_service_ts_1 = require("../services/image.service.ts");
const validation_middleware_ts_1 = require("../middleware/validation.middleware.ts");
const error_middleware_ts_1 = require("../middleware/error.middleware.ts");
const customer_middleware_ts_1 = require("../middleware/customer.middleware.ts");
const response_ts_1 = require("../utils/response.ts");
const router = (0, express_1.Router)();
// All cart routes require customer identification
router.use(customer_middleware_ts_1.requireCustomer);
/**
 * @route   GET /api/v1/cart
 * @desc    Get cart items with full details
 * @access  Private
 */
router.get('/', (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const items = await cart_repository_ts_1.cartRepository.findWithDetails(req.customerId);
    // Fetch images for products
    const productIds = [...new Set(items.map((item) => item.productId))];
    const images = await image_service_ts_1.imageService.getMainImagesForEntities(productIds, 'products');
    const itemsWithImages = items.map((item) => ({
        ...item,
        imageUrl: images.get(item.productId) || null,
    }));
    // Calculate totals
    const { subtotal, itemCount } = await cart_repository_ts_1.cartRepository.getCartTotal(req.customerId);
    return (0, response_ts_1.sendSuccess)(res, {
        items: itemsWithImages,
        subtotal,
        itemCount,
    });
}));
/**
 * @route   POST /api/v1/cart
 * @desc    Add item to cart
 * @access  Private
 */
router.post('/', (0, validation_middleware_ts_1.validate)({ body: validation_middleware_ts_1.schemas.cartItem }), (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const { variantId, quantity } = req.body;
    // Check shop limit
    const limitCheck = await cart_repository_ts_1.cartRepository.checkShopLimit(req.customerId, variantId, quantity);
    if (!limitCheck.allowed) {
        return (0, response_ts_1.sendError)(res, `Cannot add ${quantity} items. Maximum allowed: ${limitCheck.maxAllowedQuantity}, ` +
            `Current in cart: ${limitCheck.currentQuantity}, You can add: ${limitCheck.remainingQuantity}`, 400, 'SHOP_LIMIT_EXCEEDED');
    }
    // Check stock availability
    const canAdd = await cart_repository_ts_1.cartRepository.canAddToCart(variantId, quantity);
    if (!canAdd) {
        return (0, response_ts_1.sendError)(res, 'Insufficient stock for this item', 400, 'INSUFFICIENT_STOCK');
    }
    const item = await cart_repository_ts_1.cartRepository.addItem(req.customerId, variantId, quantity);
    return (0, response_ts_1.sendCreated)(res, item, 'Item added to cart');
}));
/**
 * @route   PUT /api/v1/cart/:cartId
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put('/:cartId', (0, validation_middleware_ts_1.validate)({
    params: zod_1.z.object({ cartId: zod_1.z.string().transform(Number) }),
    body: validation_middleware_ts_1.schemas.cartUpdate,
}), (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const cartId = parseInt(req.params.cartId, 10);
    const { quantity } = req.body;
    try {
        const item = await cart_repository_ts_1.cartRepository.updateQuantity(cartId, quantity);
        return (0, response_ts_1.sendSuccess)(res, item, 'Cart updated');
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Item removed from cart') {
            return (0, response_ts_1.sendSuccess)(res, null, 'Item removed from cart');
        }
        throw error;
    }
}));
/**
 * @route   DELETE /api/v1/cart/:cartId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/:cartId', (0, validation_middleware_ts_1.validate)({ params: zod_1.z.object({ cartId: zod_1.z.string().transform(Number) }) }), (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const cartId = parseInt(req.params.cartId, 10);
    await cart_repository_ts_1.cartRepository.removeItem(cartId);
    return (0, response_ts_1.sendNoContent)(res);
}));
/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/', (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    await cart_repository_ts_1.cartRepository.clearCart(req.customerId);
    return (0, response_ts_1.sendNoContent)(res);
}));
/**
 * @route   POST /api/v1/cart/validate
 * @desc    Validate cart stock and get adjustments
 * @access  Private
 */
router.post('/validate', (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const validations = await cart_repository_ts_1.cartRepository.validateCartStock(req.customerId);
    const hasIssues = validations.some((v) => !v.isValid);
    return (0, response_ts_1.sendSuccess)(res, {
        valid: !hasIssues,
        adjustments: validations,
    });
}));
/**
 * @route   POST /api/v1/cart/apply-adjustments
 * @desc    Apply cart stock adjustments
 * @access  Private
 */
router.post('/apply-adjustments', (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const { adjustments } = req.body;
    if (!Array.isArray(adjustments)) {
        return (0, response_ts_1.sendError)(res, 'Adjustments array required', 400);
    }
    const success = await cart_repository_ts_1.cartRepository.applyCartAdjustments(req.customerId, adjustments);
    if (success) {
        return (0, response_ts_1.sendSuccess)(res, null, 'Cart adjustments applied');
    }
    else {
        return (0, response_ts_1.sendError)(res, 'Failed to apply adjustments', 500);
    }
}));
/**
 * @route   GET /api/v1/cart/count
 * @desc    Get cart item count
 * @access  Private
 */
router.get('/count', (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const count = await cart_repository_ts_1.cartRepository.getItemCount(req.customerId);
    return (0, response_ts_1.sendSuccess)(res, { count });
}));
/**
 * @route   POST /api/v1/cart/transfer-to-kiosk
 * @desc    Transfer cart to kiosk for in-store checkout
 * @access  Private
 */
router.post('/transfer-to-kiosk', (0, error_middleware_ts_1.asyncHandler)(async (req, res) => {
    if (!req.customerId) {
        return (0, response_ts_1.sendError)(res, 'Unauthorized', 401);
    }
    const { kioskSessionId } = req.body;
    if (!kioskSessionId) {
        return (0, response_ts_1.sendError)(res, 'Kiosk session ID required', 400);
    }
    const success = await cart_repository_ts_1.cartRepository.transferToKiosk(req.customerId, kioskSessionId);
    if (success) {
        return (0, response_ts_1.sendSuccess)(res, null, 'Cart transferred to kiosk');
    }
    else {
        return (0, response_ts_1.sendError)(res, 'Failed to transfer cart', 500);
    }
}));
exports.default = router;
//# sourceMappingURL=cart.routes.js.map