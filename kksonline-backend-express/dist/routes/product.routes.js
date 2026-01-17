"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const product_repository_1 = require("../repositories/product.repository");
const review_repository_1 = require("../repositories/review.repository");
const supabase_image_service_1 = require("../services/supabase-image.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/v1/products
 * @desc    Get products with optional filters and pagination
 * @access  Public
 */
router.get('/', (0, validation_middleware_1.validate)({ query: validation_middleware_1.schemas.searchQuery }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { q, categoryId, brandId, minPrice, maxPrice, isPopular, tag, sortBy, sortOrder, page, pageSize } = req.query;
    const result = await product_repository_1.productRepository.search({
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
    const images = await supabase_image_service_1.supabaseImageService.getMainImagesForEntities(productIds, 'products');
    const productsWithImages = result.products.map((product) => ({
        ...product,
        mainImage: images.get(product.product_id) || null,
    }));
    return (0, response_1.sendPaginated)(res, productsWithImages, {
        page: page || 1,
        pageSize: pageSize || 20,
        total: result.total,
    });
}));
/**
 * @route   GET /api/v1/products/popular
 * @desc    Get popular products
 * @access  Public
 */
router.get('/popular', (0, validation_middleware_1.validate)({ query: validation_middleware_1.schemas.pagination }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    const products = await product_repository_1.productRepository.findPopular({ limit: pageSize, offset });
    const total = await product_repository_1.productRepository.getCount({ isPopular: true });
    logger_1.logger.info(`[ProductRoutes] /popular - Found ${products.length} products, fetching images...`);
    // Fetch images
    const productIds = products.map((p) => p.product_id);
    logger_1.logger.debug(`[ProductRoutes] /popular - Product IDs:`, productIds);
    const images = await supabase_image_service_1.supabaseImageService.getMainImagesForEntities(productIds, 'products');
    logger_1.logger.info(`[ProductRoutes] /popular - Images map size: ${images.size}, Product IDs requested: ${productIds.length}`);
    const productsWithImages = products.map((product) => {
        const imageUrl = images.get(product.product_id) || null;
        logger_1.logger.debug(`[ProductRoutes] /popular - Product ${product.product_id} (${product.name}): image = ${imageUrl || 'NULL'}`);
        return {
            ...product,
            mainImage: imageUrl,
        };
    });
    const productsWithImagesCount = productsWithImages.filter(p => p.mainImage).length;
    logger_1.logger.info(`[ProductRoutes] /popular - Returning ${productsWithImages.length} products, ${productsWithImagesCount} with images`);
    return (0, response_1.sendPaginated)(res, productsWithImages, { page, pageSize, total });
}));
/**
 * @route   GET /api/v1/products/search/suggestions
 * @desc    Get search suggestions
 * @access  Public
 */
router.get('/search/suggestions', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const query = req.query.q;
    if (!query || query.length < 2) {
        return (0, response_1.sendSuccess)(res, []);
    }
    const suggestions = await product_repository_1.productRepository.getSearchSuggestions(query);
    return (0, response_1.sendSuccess)(res, suggestions);
}));
/**
 * @route   GET /api/v1/products/category/:categoryId
 * @desc    Get products by category
 * @access  Public
 */
router.get('/category/:categoryId', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({ categoryId: zod_1.z.string().transform(Number) }),
    query: validation_middleware_1.schemas.pagination,
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const categoryId = parseInt(req.params.categoryId, 10);
    const { page = 1, pageSize = 20 } = req.query;
    const result = await product_repository_1.productRepository.findByCategory(categoryId, { page, pageSize });
    // Fetch images
    const productIds = result.products.map((p) => p.product_id);
    const images = await supabase_image_service_1.supabaseImageService.getMainImagesForEntities(productIds, 'products');
    const productsWithImages = result.products.map((product) => ({
        ...product,
        mainImage: images.get(product.product_id) || null,
    }));
    return (0, response_1.sendPaginated)(res, productsWithImages, { page, pageSize, total: result.total });
}));
/**
 * @route   GET /api/v1/products/brand/:brandId
 * @desc    Get products by brand
 * @access  Public
 */
router.get('/brand/:brandId', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({ brandId: zod_1.z.string().transform(Number) }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const brandId = parseInt(req.params.brandId, 10);
    const limit = parseInt(req.query.limit, 10) || 50;
    const products = await product_repository_1.productRepository.findByBrand(brandId, { limit });
    // Fetch images
    const productIds = products.map((p) => p.product_id);
    const images = await supabase_image_service_1.supabaseImageService.getMainImagesForEntities(productIds, 'products');
    const productsWithImages = products.map((product) => ({
        ...product,
        mainImage: images.get(product.product_id) || null,
    }));
    return (0, response_1.sendSuccess)(res, productsWithImages);
}));
/**
 * @route   GET /api/v1/products/:id
 * @desc    Get product by ID with full details
 * @access  Public
 */
router.get('/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const product = await product_repository_1.productRepository.findByIdWithDetails(productId);
    if (!product) {
        return (0, response_1.sendNotFound)(res, 'Product not found');
    }
    // Get rating
    const rating = await review_repository_1.reviewRepository.getAverageRating(productId);
    return (0, response_1.sendSuccess)(res, {
        ...product,
        rating: rating.average,
        reviewCount: rating.count,
    });
}));
/**
 * @route   GET /api/v1/products/:id/variants
 * @desc    Get product variants
 * @access  Public
 */
router.get('/:id/variants', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const variants = await product_repository_1.productRepository.getVariants(productId);
    return (0, response_1.sendSuccess)(res, variants);
}));
/**
 * @route   GET /api/v1/products/:id/reviews
 * @desc    Get product reviews
 * @access  Public
 */
router.get('/:id/reviews', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const reviews = await review_repository_1.reviewRepository.findByProductId(productId);
    const rating = await review_repository_1.reviewRepository.getAverageRating(productId);
    return (0, response_1.sendSuccess)(res, {
        reviews,
        averageRating: rating.average,
        totalReviews: rating.count,
    });
}));
/**
 * @route   GET /api/v1/products/:id/images
 * @desc    Get all product images
 * @access  Public
 */
router.get('/:id/images', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const images = await supabase_image_service_1.supabaseImageService.getAllImagesForEntity(productId, 'products');
    return (0, response_1.sendSuccess)(res, images);
}));
/**
 * @route   GET /api/v1/products/:id/related
 * @desc    Get related products (same category, limit 6)
 * @access  Public
 */
router.get('/:id/related', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    // Get the product to find its category
    const product = await product_repository_1.productRepository.findById(productId);
    if (!product || !product.category_id) {
        return (0, response_1.sendSuccess)(res, []);
    }
    // Get products from the same category, excluding current product
    const result = await product_repository_1.productRepository.findByCategory(product.category_id, {
        page: 1,
        pageSize: 7 // Get 7 to ensure we have 6 after filtering current product
    });
    // Filter out current product and limit to 6
    const relatedProducts = result.products
        .filter(p => p.product_id !== productId)
        .slice(0, 6);
    // Fetch images for related products
    const productIds = relatedProducts.map(p => p.product_id);
    const images = await supabase_image_service_1.supabaseImageService.getMainImagesForEntities(productIds, 'products');
    const productsWithImages = relatedProducts.map(p => ({
        ...p,
        mainImage: images.get(p.product_id) || null,
    }));
    return (0, response_1.sendSuccess)(res, productsWithImages);
}));
exports.default = router;
//# sourceMappingURL=product.routes.js.map