import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { collectionRepository } from '../repositories/collection.repository.ts';
import { validate, schemas } from '../middleware/validation.middleware.ts';
import { asyncHandler } from '../middleware/error.middleware.ts';
import { sendSuccess, sendPaginated, sendNotFound } from '../utils/response.ts';
import { logger } from '../utils/logger.ts';

const router = Router();

/**
 * @route   GET /api/v1/collections
 * @desc    Get all active collections with pagination
 * @access  Public
 */
router.get(
  '/',
  validate({ query: schemas.pagination }),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 10 } = req.query as { page?: number; pageSize?: number };
    const offset = (page - 1) * pageSize;

    const collections = await collectionRepository.findActive({ limit: pageSize, offset });
    const total = await collectionRepository.getCount(true);

    logger.info(`[CollectionRoutes] Found ${collections.length} collections`);

    return sendPaginated(res, collections, { page, pageSize, total });
  })
);

/**
 * @route   GET /api/v1/collections/featured
 * @desc    Get featured collections (for hero section)
 * @access  Public
 */
router.get(
  '/featured',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 7;
    
    const collections = await collectionRepository.findFeatured(limit);

    logger.info(`[CollectionRoutes] /featured - Found ${collections.length} featured collections`);

    return sendSuccess(res, collections);
  })
);

/**
 * @route   GET /api/v1/collections/premium
 * @desc    Get ONE premium collection (for main banner)
 * @access  Public
 */
router.get(
  '/premium',
  asyncHandler(async (req: Request, res: Response) => {
    const collection = await collectionRepository.findPremium();

    if (!collection) {
      logger.warn('[CollectionRoutes] /premium - No premium collection found');
      return sendSuccess(res, null);
    }

    logger.info(`[CollectionRoutes] /premium - Found premium collection: ${collection.name}`);

    return sendSuccess(res, collection);
  })
);

/**
 * @route   GET /api/v1/collections/standard
 * @desc    Get standard collections (non-premium, for side/bottom cards)
 * @access  Public
 */
router.get(
  '/standard',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 6;
    
    const collections = await collectionRepository.findStandard(limit);

    logger.info(`[CollectionRoutes] /standard - Found ${collections.length} standard collections`);

    return sendSuccess(res, collections);
  })
);

/**
 * @route   GET /api/v1/collections/premium
 * @desc    Get premium collection (for main banner)
 * @access  Public
 */
router.get(
  '/premium',
  asyncHandler(async (req: Request, res: Response) => {
    const premiumCollection = await collectionRepository.findPremiumCollection();

    logger.info(`[CollectionRoutes] /premium - Found premium collection:`, premiumCollection?.name || 'None');

    return sendSuccess(res, premiumCollection);
  })
);

/**
 * @route   GET /api/v1/collections/standard
 * @desc    Get standard collections (excludes premium, for hero section)
 * @access  Public
 */
router.get(
  '/standard',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 6;
    
    const collections = await collectionRepository.findStandardCollections(limit);

    logger.info(`[CollectionRoutes] /standard - Found ${collections.length} standard collections`);

    return sendSuccess(res, collections);
  })
);

/**
 * @route   GET /api/v1/collections/:id
 * @desc    Get collection by ID with full details
 * @access  Public
 */
router.get(
  '/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const collectionId = parseInt(req.params.id!, 10);

    const collection = await collectionRepository.findById(collectionId);
    
    if (!collection) {
      return sendNotFound(res, 'Collection not found');
    }

    if (!collection.is_active) {
      return sendNotFound(res, 'Collection is not active');
    }

    logger.info(`[CollectionRoutes] Fetched collection ${collectionId}: ${collection.name}`);

    return sendSuccess(res, collection);
  })
);

/**
 * @route   POST /api/v1/collections/:id/cart
 * @desc    Add collection to cart
 * @access  Public (requires customer_id)
 */
router.post(
  '/:id/cart',
  validate({
    params: schemas.idParam,
    body: z.object({
      customer_id: z.number().int().positive(),
      items: z.array(
        z.object({
          variant_id: z.number().int().positive(),
          quantity: z.number().int().positive().min(1),
        })
      ).min(1),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const collectionId = parseInt(req.params.id!, 10);
    const { customer_id, items } = req.body;

    const result = await collectionRepository.addToCart(customer_id, collectionId, items);

    logger.info(`[CollectionRoutes] Added collection ${collectionId} to cart for customer ${customer_id}`);

    return sendSuccess(res, result);
  })
);

/**
 * @route   GET /api/v1/collections/cart/:customerId
 * @desc    Get customer's collection cart
 * @access  Public
 */
router.get(
  '/cart/:customerId',
  validate({
    params: z.object({ customerId: z.string().transform(Number) }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = parseInt(req.params.customerId!, 10);

    const cartItems = await collectionRepository.getCustomerCollectionCart(customerId);

    logger.info(`[CollectionRoutes] Fetched collection cart for customer ${customerId}`);

    return sendSuccess(res, cartItems);
  })
);

/**
 * @route   DELETE /api/v1/collections/cart/:cartId
 * @desc    Remove collection from cart
 * @access  Public (requires customer_id in body)
 */
router.delete(
  '/cart/:cartId',
  validate({
    params: z.object({ cartId: z.string().transform(Number) }),
    body: z.object({
      customer_id: z.number().int().positive(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const collectionCartId = parseInt(req.params.cartId!, 10);
    const { customer_id } = req.body;

    await collectionRepository.removeFromCart(customer_id, collectionCartId);

    logger.info(`[CollectionRoutes] Removed collection cart ${collectionCartId} for customer ${customer_id}`);

    return sendSuccess(res, { message: 'Collection removed from cart' });
  })
);

/**
 * @route   POST /api/v1/collections/calculate-price
 * @desc    Calculate total price for custom collection items
 * @access  Public
 */
router.post(
  '/calculate-price',
  validate({
    body: z.object({
      items: z.array(
        z.object({
          variant_id: z.number().int().positive(),
          quantity: z.number().int().positive().min(1),
        })
      ).min(1),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { items } = req.body;

    const totalPrice = await collectionRepository.calculatePrice(items);

    return sendSuccess(res, { total_price: totalPrice });
  })
);

export default router;
