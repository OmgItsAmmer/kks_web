import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { productRepository } from '../repositories/product.repository';
import { reviewRepository } from '../repositories/review.repository';
import { supabaseImageService } from '../services/supabase-image.service';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { sendSuccess, sendPaginated, sendNotFound } from '../utils/response';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @route   GET /api/v1/products
 * @desc    Get products with optional filters and pagination
 * @access  Public
 */
router.get(
  '/',
  validate({ query: schemas.searchQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const { q, categoryId, brandId, minPrice, maxPrice, isPopular, tag, sortBy, sortOrder, page, pageSize } = req.query as {
      q?: string;
      categoryId?: number;
      brandId?: number;
      minPrice?: number;
      maxPrice?: number;
      isPopular?: boolean;
      tag?: string;
      sortBy?: 'name' | 'price' | 'created_at' | 'popularity';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      pageSize?: number;
    };

    const result = await productRepository.search({
      query: q,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      isPopular,
      tag,
      sortBy,
      sortOrder,
      page,
      pageSize,
    });

    // Fetch images for products
    const productIds = result.products.map((p) => p.product_id);
    const images = await supabaseImageService.getMainImagesForEntities(productIds, 'products');

    const productsWithImages = result.products.map((product) => ({
      ...product,
      mainImage: images.get(product.product_id) || null,
    }));

    return sendPaginated(
      res,
      productsWithImages,
      {
        page: page || 1,
        pageSize: pageSize || 20,
        total: result.total,
      }
    );
  })
);

/**
 * @route   GET /api/v1/products/popular
 * @desc    Get popular products
 * @access  Public
 */
router.get(
  '/popular',
  validate({ query: schemas.pagination }),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 10 } = req.query as { page?: number; pageSize?: number };
    const offset = (page - 1) * pageSize;

    const products = await productRepository.findPopular({ limit: pageSize, offset });
    const total = await productRepository.getCount({ isPopular: true });

    logger.info(`[ProductRoutes] /popular - Found ${products.length} products, fetching images...`);

    // Fetch images
    const productIds = products.map((p) => p.product_id);
    logger.debug(`[ProductRoutes] /popular - Product IDs:`, productIds);
    const images = await supabaseImageService.getMainImagesForEntities(productIds, 'products');

    logger.info(`[ProductRoutes] /popular - Images map size: ${images.size}, Product IDs requested: ${productIds.length}`);
    
    const productsWithImages = products.map((product) => {
      const imageUrl = images.get(product.product_id) || null;
      logger.debug(`[ProductRoutes] /popular - Product ${product.product_id} (${product.name}): image = ${imageUrl || 'NULL'}`);
      return {
        ...product,
        mainImage: imageUrl,
      };
    });

    const productsWithImagesCount = productsWithImages.filter(p => p.mainImage).length;
    logger.info(`[ProductRoutes] /popular - Returning ${productsWithImages.length} products, ${productsWithImagesCount} with images`);

    return sendPaginated(res, productsWithImages, { page, pageSize, total });
  })
);

/**
 * @route   GET /api/v1/products/search/suggestions
 * @desc    Get search suggestions
 * @access  Public
 */
router.get(
  '/search/suggestions',
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return sendSuccess(res, []);
    }

    const suggestions = await productRepository.getSearchSuggestions(query);
    return sendSuccess(res, suggestions);
  })
);

/**
 * @route   GET /api/v1/products/category/:categoryId
 * @desc    Get products by category
 * @access  Public
 */
router.get(
  '/category/:categoryId',
  validate({
    params: z.object({ categoryId: z.string().transform(Number) }),
    query: schemas.pagination,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId!, 10);
    const { page = 1, pageSize = 20 } = req.query as { page?: number; pageSize?: number };

    const result = await productRepository.findByCategory(categoryId, { page, pageSize });

    // Fetch images
    const productIds = result.products.map((p) => p.product_id);
    const images = await supabaseImageService.getMainImagesForEntities(productIds, 'products');

    const productsWithImages = result.products.map((product) => ({
      ...product,
      mainImage: images.get(product.product_id) || null,
    }));

    return sendPaginated(res, productsWithImages, { page, pageSize, total: result.total });
  })
);

/**
 * @route   GET /api/v1/products/brand/:brandId
 * @desc    Get products by brand
 * @access  Public
 */
router.get(
  '/brand/:brandId',
  validate({
    params: z.object({ brandId: z.string().transform(Number) }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const brandId = parseInt(req.params.brandId!, 10);
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const products = await productRepository.findByBrand(brandId, { limit });

    // Fetch images
    const productIds = products.map((p) => p.product_id);
    const images = await supabaseImageService.getMainImagesForEntities(productIds, 'products');

    const productsWithImages = products.map((product) => ({
      ...product,
      mainImage: images.get(product.product_id) || null,
    }));

    return sendSuccess(res, productsWithImages);
  })
);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product by ID with full details
 * @access  Public
 */
router.get(
  '/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id!, 10);

    const product = await productRepository.findByIdWithDetails(productId);
    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Get rating
    const rating = await reviewRepository.getAverageRating(productId);

    return sendSuccess(res, {
      ...product,
      rating: rating.average,
      reviewCount: rating.count,
    });
  })
);

/**
 * @route   GET /api/v1/products/:id/variants
 * @desc    Get product variants
 * @access  Public
 */
router.get(
  '/:id/variants',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id!, 10);

    const variants = await productRepository.getVariants(productId);

    return sendSuccess(res, variants);
  })
);

/**
 * @route   GET /api/v1/products/:id/reviews
 * @desc    Get product reviews
 * @access  Public
 */
router.get(
  '/:id/reviews',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id!, 10);

    const reviews = await reviewRepository.findByProductId(productId);
    const rating = await reviewRepository.getAverageRating(productId);

    return sendSuccess(res, {
      reviews,
      averageRating: rating.average,
      totalReviews: rating.count,
    });
  })
);

/**
 * @route   GET /api/v1/products/:id/images
 * @desc    Get all product images
 * @access  Public
 */
router.get(
  '/:id/images',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id!, 10);

    const images = await supabaseImageService.getAllImagesForEntity(productId, 'products');

    return sendSuccess(res, images);
  })
);

/**
 * @route   GET /api/v1/products/:id/related
 * @desc    Get related products (same category, limit 6)
 * @access  Public
 */
router.get(
  '/:id/related',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id!, 10);

    // Get the product to find its category
    const product = await productRepository.findById(productId);
    if (!product || !product.category_id) {
      return sendSuccess(res, []);
    }

    // Get products from the same category, excluding current product
    const result = await productRepository.findByCategory(product.category_id, { 
      page: 1, 
      pageSize: 7 // Get 7 to ensure we have 6 after filtering current product
    });

    // Filter out current product and limit to 6
    const relatedProducts = result.products
      .filter(p => p.product_id !== productId)
      .slice(0, 6);

    // Fetch images for related products
    const productIds = relatedProducts.map(p => p.product_id);
    const images = await supabaseImageService.getMainImagesForEntities(productIds, 'products');

    const productsWithImages = relatedProducts.map(p => ({
      ...p,
      mainImage: images.get(p.product_id) || null,
    }));

    return sendSuccess(res, productsWithImages);
  })
);

export default router;
