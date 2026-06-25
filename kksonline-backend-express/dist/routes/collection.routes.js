"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const collection_repository_1 = require("../repositories/collection.repository");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/collections
 * @desc    Get all active collections with pagination
 * @access  Public
 */
router.get('/', (0, validation_middleware_1.validate)({ query: validation_middleware_1.schemas.pagination }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    const collections = await collection_repository_1.collectionRepository.findActive({ limit: pageSize, offset });
    const total = await collection_repository_1.collectionRepository.getCount(true);
    logger_1.logger.info(`[CollectionRoutes] Found ${collections.length} collections`);
    return (0, response_1.sendPaginated)(res, collections, { page, pageSize, total });
}));
/**
 * @route   GET /api/v1/collections/featured
 * @desc    Get featured collections (for hero section)
 * @access  Public
 */
router.get('/featured', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 7;
    const collections = await collection_repository_1.collectionRepository.findFeatured(limit);
    logger_1.logger.info(`[CollectionRoutes] /featured - Found ${collections.length} featured collections`);
    logger_1.logger.debug('[CollectionRoutes] /featured - Collection image URLs:', collections.map(c => ({ id: c.collection_id, name: c.name, image_url: c.image_url })));
    return (0, response_1.sendSuccess)(res, collections);
}));
/**
 * @route   GET /api/v1/collections/premium
 * @desc    Get ONE premium collection (for main banner)
 * @access  Public
 */
router.get('/premium', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const collection = await collection_repository_1.collectionRepository.findPremium();
    if (!collection) {
        logger_1.logger.warn('[CollectionRoutes] /premium - No premium collection found');
        return (0, response_1.sendSuccess)(res, null);
    }
    logger_1.logger.info(`[CollectionRoutes] /premium - Found premium collection: ${collection.name}`);
    logger_1.logger.debug('[CollectionRoutes] /premium - Image URL:', {
        id: collection.collection_id,
        name: collection.name,
        image_url: collection.image_url
    });
    return (0, response_1.sendSuccess)(res, collection);
}));
/**
 * @route   GET /api/v1/collections/standard
 * @desc    Get standard collections (non-premium, for side/bottom cards)
 * @access  Public
 */
router.get('/standard', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 6;
    const collections = await collection_repository_1.collectionRepository.findStandard(limit);
    logger_1.logger.info(`[CollectionRoutes] /standard - Found ${collections.length} standard collections`);
    return (0, response_1.sendSuccess)(res, collections);
}));
/**
 * @route   GET /api/v1/collections/premium
 * @desc    Get standard collections (non-premium, for side/bottom cards)
 * @access  Public
 */
// NOTE: Duplicate `/premium` and `/standard` routes removed. Keep the earlier handlers above.
/**
 * @route   GET /api/v1/collections/:id
 * @desc    Get collection by ID with full details
 * @access  Public
 */
router.get('/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const collectionId = parseInt(req.params.id, 10);
    const collection = await collection_repository_1.collectionRepository.findById(collectionId);
    if (!collection) {
        return (0, response_1.sendNotFound)(res, 'Collection not found');
    }
    if (!collection.is_active) {
        return (0, response_1.sendNotFound)(res, 'Collection is not active');
    }
    logger_1.logger.info(`[CollectionRoutes] Fetched collection ${collectionId}: ${collection.name}`);
    return (0, response_1.sendSuccess)(res, collection);
}));
/**
 * @route   POST /api/v1/collections/:id/cart
 * @desc    Add collection to cart
 * @access  Public (requires customer_id)
 */
router.post('/:id/cart', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: zod_1.z.object({
        customer_id: zod_1.z.number().int().positive(),
        items: zod_1.z.array(zod_1.z.object({
            variant_id: zod_1.z.number().int().positive(),
            quantity: zod_1.z.number().int().positive().min(1),
        })).min(1),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const collectionId = parseInt(req.params.id, 10);
    const { customer_id, items } = req.body;
    const result = await collection_repository_1.collectionRepository.addToCart(customer_id, collectionId, items);
    logger_1.logger.info(`[CollectionRoutes] Added collection ${collectionId} to cart for customer ${customer_id}`);
    return (0, response_1.sendSuccess)(res, result);
}));
/**
 * @route   GET /api/v1/collections/cart/:customerId
 * @desc    Get customer's collection cart
 * @access  Public
 */
router.get('/cart/:customerId', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({ customerId: zod_1.z.string().transform(Number) }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const customerId = parseInt(req.params.customerId, 10);
    const cartItems = await collection_repository_1.collectionRepository.getCustomerCollectionCart(customerId);
    logger_1.logger.info(`[CollectionRoutes] Fetched collection cart for customer ${customerId}`);
    return (0, response_1.sendSuccess)(res, cartItems);
}));
/**
 * @route   DELETE /api/v1/collections/cart/:cartId
 * @desc    Remove collection from cart
 * @access  Public (requires customer_id in body)
 */
router.delete('/cart/:cartId', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({ cartId: zod_1.z.string().transform(Number) }),
    body: zod_1.z.object({
        customer_id: zod_1.z.number().int().positive(),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const collectionCartId = parseInt(req.params.cartId, 10);
    const { customer_id } = req.body;
    await collection_repository_1.collectionRepository.removeFromCart(customer_id, collectionCartId);
    logger_1.logger.info(`[CollectionRoutes] Removed collection cart ${collectionCartId} for customer ${customer_id}`);
    return (0, response_1.sendSuccess)(res, { message: 'Collection removed from cart' });
}));
/**
 * @route   POST /api/v1/collections/calculate-price
 * @desc    Calculate total price for custom collection items
 * @access  Public
 */
router.post('/calculate-price', (0, validation_middleware_1.validate)({
    body: zod_1.z.object({
        items: zod_1.z.array(zod_1.z.object({
            variant_id: zod_1.z.number().int().positive(),
            quantity: zod_1.z.number().int().positive().min(1),
        })).min(1),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { items } = req.body;
    const totalPrice = await collection_repository_1.collectionRepository.calculatePrice(items);
    return (0, response_1.sendSuccess)(res, { total_price: totalPrice });
}));
exports.default = router;
//# sourceMappingURL=collection.routes.js.map