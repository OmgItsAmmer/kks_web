import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { collectionRepository } from '../repositories/collection.repository';
import { validate, schemas, numericParam } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { sendSuccess, sendError, sendPaginated, sendNotFound } from '../utils/response';
import { requireCustomer } from '../middleware/customer.middleware';
import type { CustomerRequest } from '../types/api.types';
import { logger } from '../utils/logger';

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
    logger.debug('[CollectionRoutes] /featured - Collection image URLs:',
      collections.map(c => ({ id: c.collection_id, name: c.name, image_url: c.image_url }))
    );

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
    logger.debug('[CollectionRoutes] /premium - Image URL:', {
      id: collection.collection_id,
      name: collection.name,
      image_url: collection.image_url
    });

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
 * @desc    Get standard collections (non-premium, for side/bottom cards)
 * @access  Public
 */
// NOTE: Duplicate `/premium` and `/standard` routes removed. Keep the earlier handlers above.

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
  requireCustomer,
  validate({
    params: schemas.idParam,
    body: z.object({
      customer_id: z.number().int().positive().optional(),
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
    const { items } = req.body;
    // The customer always comes from the signed token, never from the request body.
    const customer_id = (req as CustomerRequest).customerId as number;

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
  requireCustomer,
  validate({
    params: z.object({ customerId: numericParam }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = parseInt(req.params.customerId!, 10);
    if (customerId !== (req as CustomerRequest).customerId) {
      return sendError(res, 'Forbidden', 403);
    }

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
  requireCustomer,
  validate({
    params: z.object({ cartId: numericParam }),
    body: z.object({
      customer_id: z.number().int().positive().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const collectionCartId = parseInt(req.params.cartId!, 10);
    const customer_id = (req as CustomerRequest).customerId as number;

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
