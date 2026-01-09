import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { productRepository } from '../repositories/product.repository.ts';
import { reviewRepository } from '../repositories/review.repository.ts';
import { imageService } from '../services/image.service.ts';
import { validate, schemas } from '../middleware/validation.middleware.ts';
import { asyncHandler } from '../middleware/error.middleware.ts';
import { sendSuccess, sendPaginated, sendNotFound } from '../utils/response.ts';

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
    const images = await imageService.getMainImagesForEntities(productIds, 'products');

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

    // Fetch images
    const productIds = products.map((p) => p.product_id);
    const images = await imageService.getMainImagesForEntities(productIds, 'products');

    const productsWithImages = products.map((product) => ({
      ...product,
      mainImage: images.get(product.product_id) || null,
    }));

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
    const images = await imageService.getMainImagesForEntities(productIds, 'products');

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
    const images = await imageService.getMainImagesForEntities(productIds, 'products');

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

    const images = await imageService.getAllImagesForEntity(productId, 'products');

    return sendSuccess(res, images);
  })
);

export default router;
