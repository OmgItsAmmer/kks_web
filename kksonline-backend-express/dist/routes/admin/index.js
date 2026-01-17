"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const product_service_1 = require("../../services/product.service");
const product_repository_1 = require("../../repositories/product.repository");
const category_repository_1 = require("../../repositories/category.repository");
const brand_repository_1 = require("../../repositories/brand.repository");
const order_repository_1 = require("../../repositories/order.repository");
const customer_repository_1 = require("../../repositories/customer.repository");
const review_repository_1 = require("../../repositories/review.repository");
const shop_repository_1 = require("../../repositories/shop.repository");
const image_service_1 = require("../../services/image.service");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const error_middleware_1 = require("../../middleware/error.middleware");
const response_1 = require("../../utils/response");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
// TODO: Add proper admin authentication when needed
// For now, admin routes are accessible without authentication
// ==================== PRODUCTS ====================
/**
 * @route   GET /api/v1/admin/products
 * @desc    Get all products (including hidden)
 * @access  Admin
 */
router.get('/products', (0, validation_middleware_1.validate)({ query: validation_middleware_1.schemas.pagination }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await product_repository_1.productRepository.findAll({ page, pageSize, visibleOnly: false });
    return (0, response_1.sendPaginated)(res, result.products, { page, pageSize, total: result.total });
}));
/**
 * @route   POST /api/v1/admin/products
 * @desc    Create product
 * @access  Admin
 */
router.post('/products', (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.product }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const product = await product_service_1.productService.createProduct({
        name: req.body.name,
        description: req.body.description,
        base_price: req.body.basePrice,
        sale_price: req.body.salePrice,
        category_id: req.body.categoryId,
        brandID: req.body.brandID,
        ispopular: req.body.ispopular,
        isVisible: req.body.isVisible,
        tag: req.body.tag,
        stock_quantity: req.body.stockQuantity,
        alert_stock: req.body.alertStock,
    });
    return (0, response_1.sendCreated)(res, product, 'Product created successfully');
}));
/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Update product
 * @access  Admin
 */
router.put('/products/:id', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: validation_middleware_1.schemas.product.partial(),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const product = await product_service_1.productService.updateProduct(productId, {
        name: req.body.name,
        description: req.body.description,
        base_price: req.body.basePrice,
        sale_price: req.body.salePrice,
        category_id: req.body.categoryId,
        brandID: req.body.brandID,
        ispopular: req.body.ispopular,
        isVisible: req.body.isVisible,
        tag: req.body.tag,
        stock_quantity: req.body.stockQuantity,
        alert_stock: req.body.alertStock,
    });
    return (0, response_1.sendSuccess)(res, product, 'Product updated successfully');
}));
/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Delete product
 * @access  Admin
 */
router.delete('/products/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    await product_service_1.productService.deleteProduct(productId);
    return (0, response_1.sendSuccess)(res, null, 'Product deleted successfully');
}));
/**
 * @route   PATCH /api/v1/admin/products/:id/visibility
 * @desc    Toggle product visibility
 * @access  Admin
 */
router.patch('/products/:id/visibility', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: zod_1.z.object({ isVisible: zod_1.z.boolean() }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const { isVisible } = req.body;
    const product = await product_service_1.productService.toggleVisibility(productId, isVisible);
    return (0, response_1.sendSuccess)(res, product, 'Product visibility updated');
}));
/**
 * @route   POST /api/v1/admin/products/bulk-update
 * @desc    Bulk update products
 * @access  Admin
 */
router.post('/products/bulk-update', (0, validation_middleware_1.validate)({
    body: zod_1.z.object({
        productIds: zod_1.z.array(zod_1.z.number().int().positive()),
        updates: validation_middleware_1.schemas.product.partial(),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { productIds, updates } = req.body;
    const result = await product_service_1.productService.bulkUpdateProducts(productIds, {
        name: updates.name,
        description: updates.description,
        base_price: updates.basePrice,
        sale_price: updates.salePrice,
        category_id: updates.categoryId,
        brandID: updates.brandID,
        ispopular: updates.ispopular,
        isVisible: updates.isVisible,
        tag: updates.tag,
        stock_quantity: updates.stockQuantity,
        alert_stock: updates.alertStock,
    });
    return (0, response_1.sendSuccess)(res, result, 'Bulk update completed');
}));
/**
 * @route   POST /api/v1/admin/products/bulk-delete
 * @desc    Bulk delete products
 * @access  Admin
 */
router.post('/products/bulk-delete', (0, validation_middleware_1.validate)({
    body: zod_1.z.object({
        productIds: zod_1.z.array(zod_1.z.number().int().positive()),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { productIds } = req.body;
    const result = await product_service_1.productService.bulkDeleteProducts(productIds);
    return (0, response_1.sendSuccess)(res, result, 'Bulk delete completed');
}));
/**
 * @route   POST /api/v1/admin/products/:id/images
 * @desc    Upload product image
 * @access  Admin
 */
router.post('/products/:id/images', upload.single('image'), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const isFeatured = req.body.isFeatured === 'true';
    if (!req.file) {
        return (0, response_1.sendError)(res, 'No image file provided', 400);
    }
    const result = isFeatured
        ? await image_service_1.imageService.updateMainImage(req.file.buffer, 'products', productId)
        : await image_service_1.imageService.addImage(req.file.buffer, 'products', productId);
    return (0, response_1.sendCreated)(res, result);
}));
// ==================== VARIANTS ====================
/**
 * @route   GET /api/v1/admin/products/:id/variants
 * @desc    Get all product variants (including hidden)
 * @access  Admin
 */
router.get('/products/:id/variants', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const variants = await product_repository_1.productRepository.getAllVariants(productId);
    return (0, response_1.sendSuccess)(res, variants);
}));
/**
 * @route   POST /api/v1/admin/products/:id/variants
 * @desc    Create product variant
 * @access  Admin
 */
router.post('/products/:id/variants', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: validation_middleware_1.schemas.productVariant.omit({ productId: true }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const variant = await product_service_1.productService.createVariant({
        product_id: productId,
        variant_name: req.body.variantName,
        sell_price: req.body.sellPrice,
        buy_price: req.body.buyPrice,
        stock: req.body.stock,
        sku: req.body.sku,
        is_visible: req.body.isVisible,
        alert_stock: req.body.alertStock,
    });
    return (0, response_1.sendCreated)(res, variant, 'Variant created successfully');
}));
/**
 * @route   PUT /api/v1/admin/products/:id/variants/:variantId
 * @desc    Update product variant
 * @access  Admin
 */
router.put('/products/:id/variants/:variantId', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({
        id: zod_1.z.string().transform(Number),
        variantId: zod_1.z.string().transform(Number),
    }),
    body: validation_middleware_1.schemas.productVariant.omit({ productId: true }).partial(),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const variantId = parseInt(req.params.variantId, 10);
    const variant = await product_service_1.productService.updateVariant(variantId, {
        variant_name: req.body.variantName,
        sell_price: req.body.sellPrice,
        buy_price: req.body.buyPrice,
        stock: req.body.stock,
        sku: req.body.sku,
        is_visible: req.body.isVisible,
        alert_stock: req.body.alertStock,
    });
    return (0, response_1.sendSuccess)(res, variant, 'Variant updated successfully');
}));
/**
 * @route   DELETE /api/v1/admin/products/:id/variants/:variantId
 * @desc    Delete product variant
 * @access  Admin
 */
router.delete('/products/:id/variants/:variantId', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({
        id: zod_1.z.string().transform(Number),
        variantId: zod_1.z.string().transform(Number),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const variantId = parseInt(req.params.variantId, 10);
    await product_service_1.productService.deleteVariant(variantId);
    return (0, response_1.sendSuccess)(res, null, 'Variant deleted successfully');
}));
// Legacy variant routes (for backward compatibility)
/**
 * @route   POST /api/v1/admin/variants
 * @desc    Create product variant (legacy)
 * @access  Admin
 */
router.post('/variants', (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.productVariant }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const variant = await product_service_1.productService.createVariant({
        product_id: req.body.productId,
        variant_name: req.body.variantName,
        sell_price: req.body.sellPrice,
        buy_price: req.body.buyPrice,
        stock: req.body.stock,
        sku: req.body.sku,
        is_visible: req.body.isVisible,
        alert_stock: req.body.alertStock,
    });
    return (0, response_1.sendCreated)(res, variant);
}));
/**
 * @route   PUT /api/v1/admin/variants/:id
 * @desc    Update product variant (legacy)
 * @access  Admin
 */
router.put('/variants/:id', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: validation_middleware_1.schemas.productVariant.partial(),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const variantId = parseInt(req.params.id, 10);
    const variant = await product_service_1.productService.updateVariant(variantId, {
        variant_name: req.body.variantName,
        sell_price: req.body.sellPrice,
        buy_price: req.body.buyPrice,
        stock: req.body.stock,
        sku: req.body.sku,
        is_visible: req.body.isVisible,
        alert_stock: req.body.alertStock,
    });
    return (0, response_1.sendSuccess)(res, variant);
}));
/**
 * @route   DELETE /api/v1/admin/variants/:id
 * @desc    Delete product variant (legacy)
 * @access  Admin
 */
router.delete('/variants/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const variantId = parseInt(req.params.id, 10);
    await product_service_1.productService.deleteVariant(variantId);
    return (0, response_1.sendNoContent)(res);
}));
// ==================== CATEGORIES ====================
/**
 * @route   POST /api/v1/admin/categories
 * @desc    Create category
 * @access  Admin
 */
router.post('/categories', (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.category }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const category = await category_repository_1.categoryRepository.create({
        category_name: req.body.categoryName,
        isFeatured: req.body.isFeatured,
    });
    return (0, response_1.sendCreated)(res, category);
}));
/**
 * @route   PUT /api/v1/admin/categories/:id
 * @desc    Update category
 * @access  Admin
 */
router.put('/categories/:id', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: validation_middleware_1.schemas.category.partial(),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    const updates = {};
    if (req.body.categoryName !== undefined)
        updates.category_name = req.body.categoryName;
    if (req.body.isFeatured !== undefined)
        updates.isFeatured = req.body.isFeatured;
    const category = await category_repository_1.categoryRepository.update(categoryId, updates);
    return (0, response_1.sendSuccess)(res, category);
}));
/**
 * @route   DELETE /api/v1/admin/categories/:id
 * @desc    Delete category
 * @access  Admin
 */
router.delete('/categories/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    await image_service_1.imageService.deleteAllImagesForEntity(categoryId, 'categories');
    await category_repository_1.categoryRepository.delete(categoryId);
    return (0, response_1.sendNoContent)(res);
}));
/**
 * @route   POST /api/v1/admin/categories/:id/image
 * @desc    Upload category image
 * @access  Admin
 */
router.post('/categories/:id/image', upload.single('image'), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    if (!req.file) {
        return (0, response_1.sendError)(res, 'No image file provided', 400);
    }
    const result = await image_service_1.imageService.updateMainImage(req.file.buffer, 'categories', categoryId);
    return (0, response_1.sendCreated)(res, result);
}));
// ==================== BRANDS ====================
/**
 * @route   POST /api/v1/admin/brands
 * @desc    Create brand
 * @access  Admin
 */
router.post('/brands', (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.brand }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const brand = await brand_repository_1.brandRepository.create({
        brandname: req.body.brandname,
        isVerified: req.body.isVerified,
        isFeatured: req.body.isFeatured,
    });
    return (0, response_1.sendCreated)(res, brand);
}));
/**
 * @route   PUT /api/v1/admin/brands/:id
 * @desc    Update brand
 * @access  Admin
 */
router.put('/brands/:id', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: validation_middleware_1.schemas.brand.partial(),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    const updates = {};
    if (req.body.brandname !== undefined)
        updates.brandname = req.body.brandname;
    if (req.body.isVerified !== undefined)
        updates.isVerified = req.body.isVerified;
    if (req.body.isFeatured !== undefined)
        updates.isFeatured = req.body.isFeatured;
    const brand = await brand_repository_1.brandRepository.update(brandId, updates);
    return (0, response_1.sendSuccess)(res, brand);
}));
/**
 * @route   DELETE /api/v1/admin/brands/:id
 * @desc    Delete brand
 * @access  Admin
 */
router.delete('/brands/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    await image_service_1.imageService.deleteAllImagesForEntity(brandId, 'brands');
    await brand_repository_1.brandRepository.delete(brandId);
    return (0, response_1.sendNoContent)(res);
}));
/**
 * @route   POST /api/v1/admin/brands/:id/image
 * @desc    Upload brand image
 * @access  Admin
 */
router.post('/brands/:id/image', upload.single('image'), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    if (!req.file) {
        return (0, response_1.sendError)(res, 'No image file provided', 400);
    }
    const result = await image_service_1.imageService.updateMainImage(req.file.buffer, 'brands', brandId);
    return (0, response_1.sendCreated)(res, result);
}));
// ==================== ORDERS ====================
/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get all orders
 * @access  Admin
 */
router.get('/orders', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, pageSize = 20, status, customerId, startDate, endDate } = req.query;
    const result = await order_repository_1.orderRepository.findAll({
        page: Number(page),
        pageSize: Number(pageSize),
        status: status,
        customerId: customerId ? Number(customerId) : undefined,
        startDate,
        endDate,
    });
    return (0, response_1.sendPaginated)(res, result.orders, { page: Number(page), pageSize: Number(pageSize), total: result.total });
}));
/**
 * @route   PUT /api/v1/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.put('/orders/:id/status', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: validation_middleware_1.schemas.orderStatusUpdate,
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const order = await order_repository_1.orderRepository.updateStatus(orderId, status);
    return (0, response_1.sendSuccess)(res, order, 'Order status updated');
}));
/**
 * @route   GET /api/v1/admin/orders/statistics
 * @desc    Get order statistics
 * @access  Admin
 */
router.get('/orders/statistics', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate } = req.query;
    const stats = await order_repository_1.orderRepository.getStatistics({ startDate, endDate });
    return (0, response_1.sendSuccess)(res, stats);
}));
// ==================== CUSTOMERS ====================
/**
 * @route   GET /api/v1/admin/customers
 * @desc    Get all customers
 * @access  Admin
 */
router.get('/customers', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, pageSize = 20, search } = req.query;
    const result = await customer_repository_1.customerRepository.findAll({
        page: Number(page),
        pageSize: Number(pageSize),
        search,
    });
    return (0, response_1.sendPaginated)(res, result.customers, { page: Number(page), pageSize: Number(pageSize), total: result.total });
}));
// ==================== REVIEWS ====================
/**
 * @route   GET /api/v1/admin/reviews
 * @desc    Get all reviews
 * @access  Admin
 */
router.get('/reviews', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { page = 1, pageSize = 20, productId, customerId } = req.query;
    const result = await review_repository_1.reviewRepository.findAll({
        page: Number(page),
        pageSize: Number(pageSize),
        productId: productId ? Number(productId) : undefined,
        customerId: customerId ? Number(customerId) : undefined,
    });
    return (0, response_1.sendPaginated)(res, result.reviews, { page: Number(page), pageSize: Number(pageSize), total: result.total });
}));
/**
 * @route   DELETE /api/v1/admin/reviews/:id
 * @desc    Delete review
 * @access  Admin
 */
router.delete('/reviews/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const reviewId = BigInt(req.params.id);
    await review_repository_1.reviewRepository.delete(reviewId);
    return (0, response_1.sendNoContent)(res);
}));
// ==================== SHOP CONFIG ====================
/**
 * @route   PUT /api/v1/admin/shop/config
 * @desc    Update shop configuration
 * @access  Admin
 */
router.put('/shop/config', (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.shopConfig }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const updates = {};
    if (req.body.shopname !== undefined)
        updates.shopname = req.body.shopname;
    if (req.body.taxrate !== undefined)
        updates.taxrate = req.body.taxrate;
    if (req.body.shippingPrice !== undefined)
        updates.shipping_price = req.body.shippingPrice;
    if (req.body.thresholdFreeShipping !== undefined)
        updates.threshold_free_shipping = req.body.thresholdFreeShipping;
    if (req.body.isShippingEnable !== undefined)
        updates.is_shipping_enable = req.body.isShippingEnable;
    if (req.body.maxAllowedItemQuantity !== undefined)
        updates.max_allowed_item_quantity = req.body.maxAllowedItemQuantity;
    const config = await shop_repository_1.shopRepository.updateConfig(updates);
    return (0, response_1.sendSuccess)(res, config, 'Shop configuration updated');
}));
/**
 * @route   POST /api/v1/admin/app-versions
 * @desc    Create new app version
 * @access  Admin
 */
router.post('/app-versions', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { version, forceUpdate, appLocked, redirectUrl, description } = req.body;
    if (!version || !redirectUrl) {
        return (0, response_1.sendError)(res, 'Version and redirectUrl are required', 400);
    }
    const appVersion = await shop_repository_1.shopRepository.createAppVersion({
        version,
        forceUpdate,
        appLocked,
        redirectUrl,
        description,
    });
    return (0, response_1.sendCreated)(res, appVersion);
}));
// ==================== IMAGES ====================
/**
 * @route   DELETE /api/v1/admin/images/:id
 * @desc    Delete an image
 * @access  Admin
 */
router.delete('/images/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const imageEntityId = parseInt(req.params.id, 10);
    await image_service_1.imageService.deleteImage(imageEntityId);
    return (0, response_1.sendNoContent)(res);
}));
exports.default = router;
//# sourceMappingURL=index.js.map