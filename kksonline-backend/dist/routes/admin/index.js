import { Router } from 'express';
import multer from 'multer';
import { productRepository } from '../../repositories/product.repository.js';
import { categoryRepository } from '../../repositories/category.repository.js';
import { brandRepository } from '../../repositories/brand.repository.js';
import { orderRepository } from '../../repositories/order.repository.js';
import { customerRepository } from '../../repositories/customer.repository.js';
import { reviewRepository } from '../../repositories/review.repository.js';
import { shopRepository } from '../../repositories/shop.repository.js';
import { imageService } from '../../services/image.service.js';
import { validate, schemas } from '../../middleware/validation.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated, sendError } from '../../utils/response.js';
import { ForbiddenError } from '../../utils/errors.js';
const router = Router();
// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
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
// Admin authentication middleware
// TODO: Implement proper admin role verification
const requireAdmin = async (req, res, next) => {
    // For now, check if user is authenticated
    // In production, add proper admin role check
    if (!req.user) {
        throw new ForbiddenError('Admin access required');
    }
    // TODO: Check user.role === 'admin'
    next();
};
router.use(authenticate);
// router.use(requireAdmin); // Uncomment when admin roles are implemented
// ==================== PRODUCTS ====================
/**
 * @route   GET /api/v1/admin/products
 * @desc    Get all products (including hidden)
 * @access  Admin
 */
router.get('/products', validate({ query: schemas.pagination }), asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await productRepository.findAll({ page, pageSize, visibleOnly: false });
    return sendPaginated(res, result.products, { page, pageSize, total: result.total });
}));
/**
 * @route   POST /api/v1/admin/products
 * @desc    Create product
 * @access  Admin
 */
router.post('/products', validate({ body: schemas.product }), asyncHandler(async (req, res) => {
    const product = await productRepository.create({
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
    return sendCreated(res, product);
}));
/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Update product
 * @access  Admin
 */
router.put('/products/:id', validate({
    params: schemas.idParam,
    body: schemas.product.partial(),
}), asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const updates = {};
    if (req.body.name !== undefined)
        updates.name = req.body.name;
    if (req.body.description !== undefined)
        updates.description = req.body.description;
    if (req.body.basePrice !== undefined)
        updates.base_price = req.body.basePrice;
    if (req.body.salePrice !== undefined)
        updates.sale_price = req.body.salePrice;
    if (req.body.categoryId !== undefined)
        updates.category_id = req.body.categoryId;
    if (req.body.brandID !== undefined)
        updates.brandID = req.body.brandID;
    if (req.body.ispopular !== undefined)
        updates.ispopular = req.body.ispopular;
    if (req.body.isVisible !== undefined)
        updates.isVisible = req.body.isVisible;
    if (req.body.tag !== undefined)
        updates.tag = req.body.tag;
    if (req.body.stockQuantity !== undefined)
        updates.stock_quantity = req.body.stockQuantity;
    if (req.body.alertStock !== undefined)
        updates.alert_stock = req.body.alertStock;
    const product = await productRepository.update(productId, updates);
    return sendSuccess(res, product);
}));
/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Delete product
 * @access  Admin
 */
router.delete('/products/:id', validate({ params: schemas.idParam }), asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    // Delete product images first
    await imageService.deleteAllImagesForEntity(productId, 'products');
    await productRepository.delete(productId);
    return sendNoContent(res);
}));
/**
 * @route   POST /api/v1/admin/products/:id/images
 * @desc    Upload product image
 * @access  Admin
 */
router.post('/products/:id/images', upload.single('image'), asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const isFeatured = req.body.isFeatured === 'true';
    if (!req.file) {
        return sendError(res, 'No image file provided', 400);
    }
    const result = isFeatured
        ? await imageService.updateMainImage(req.file.buffer, 'products', productId)
        : await imageService.addImage(req.file.buffer, 'products', productId);
    return sendCreated(res, result);
}));
// ==================== VARIANTS ====================
/**
 * @route   POST /api/v1/admin/variants
 * @desc    Create product variant
 * @access  Admin
 */
router.post('/variants', validate({ body: schemas.productVariant }), asyncHandler(async (req, res) => {
    const variant = await productRepository.createVariant({
        product_id: req.body.productId,
        variant_name: req.body.variantName,
        sell_price: req.body.sellPrice,
        buy_price: req.body.buyPrice,
        stock: req.body.stock,
        sku: req.body.sku,
        is_visible: req.body.isVisible,
        alert_stock: req.body.alertStock,
    });
    return sendCreated(res, variant);
}));
/**
 * @route   PUT /api/v1/admin/variants/:id
 * @desc    Update product variant
 * @access  Admin
 */
router.put('/variants/:id', validate({
    params: schemas.idParam,
    body: schemas.productVariant.partial(),
}), asyncHandler(async (req, res) => {
    const variantId = parseInt(req.params.id, 10);
    const updates = {};
    if (req.body.variantName !== undefined)
        updates.variant_name = req.body.variantName;
    if (req.body.sellPrice !== undefined)
        updates.sell_price = req.body.sellPrice;
    if (req.body.buyPrice !== undefined)
        updates.buy_price = req.body.buyPrice;
    if (req.body.stock !== undefined)
        updates.stock = req.body.stock;
    if (req.body.sku !== undefined)
        updates.sku = req.body.sku;
    if (req.body.isVisible !== undefined)
        updates.is_visible = req.body.isVisible;
    if (req.body.alertStock !== undefined)
        updates.alert_stock = req.body.alertStock;
    const variant = await productRepository.updateVariant(variantId, updates);
    return sendSuccess(res, variant);
}));
/**
 * @route   DELETE /api/v1/admin/variants/:id
 * @desc    Delete product variant
 * @access  Admin
 */
router.delete('/variants/:id', validate({ params: schemas.idParam }), asyncHandler(async (req, res) => {
    const variantId = parseInt(req.params.id, 10);
    await productRepository.deleteVariant(variantId);
    return sendNoContent(res);
}));
// ==================== CATEGORIES ====================
/**
 * @route   POST /api/v1/admin/categories
 * @desc    Create category
 * @access  Admin
 */
router.post('/categories', validate({ body: schemas.category }), asyncHandler(async (req, res) => {
    const category = await categoryRepository.create({
        category_name: req.body.categoryName,
        isFeatured: req.body.isFeatured,
    });
    return sendCreated(res, category);
}));
/**
 * @route   PUT /api/v1/admin/categories/:id
 * @desc    Update category
 * @access  Admin
 */
router.put('/categories/:id', validate({
    params: schemas.idParam,
    body: schemas.category.partial(),
}), asyncHandler(async (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    const updates = {};
    if (req.body.categoryName !== undefined)
        updates.category_name = req.body.categoryName;
    if (req.body.isFeatured !== undefined)
        updates.isFeatured = req.body.isFeatured;
    const category = await categoryRepository.update(categoryId, updates);
    return sendSuccess(res, category);
}));
/**
 * @route   DELETE /api/v1/admin/categories/:id
 * @desc    Delete category
 * @access  Admin
 */
router.delete('/categories/:id', validate({ params: schemas.idParam }), asyncHandler(async (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    await imageService.deleteAllImagesForEntity(categoryId, 'categories');
    await categoryRepository.delete(categoryId);
    return sendNoContent(res);
}));
/**
 * @route   POST /api/v1/admin/categories/:id/image
 * @desc    Upload category image
 * @access  Admin
 */
router.post('/categories/:id/image', upload.single('image'), asyncHandler(async (req, res) => {
    const categoryId = parseInt(req.params.id, 10);
    if (!req.file) {
        return sendError(res, 'No image file provided', 400);
    }
    const result = await imageService.updateMainImage(req.file.buffer, 'categories', categoryId);
    return sendCreated(res, result);
}));
// ==================== BRANDS ====================
/**
 * @route   POST /api/v1/admin/brands
 * @desc    Create brand
 * @access  Admin
 */
router.post('/brands', validate({ body: schemas.brand }), asyncHandler(async (req, res) => {
    const brand = await brandRepository.create({
        brandname: req.body.brandname,
        isVerified: req.body.isVerified,
        isFeatured: req.body.isFeatured,
    });
    return sendCreated(res, brand);
}));
/**
 * @route   PUT /api/v1/admin/brands/:id
 * @desc    Update brand
 * @access  Admin
 */
router.put('/brands/:id', validate({
    params: schemas.idParam,
    body: schemas.brand.partial(),
}), asyncHandler(async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    const updates = {};
    if (req.body.brandname !== undefined)
        updates.brandname = req.body.brandname;
    if (req.body.isVerified !== undefined)
        updates.isVerified = req.body.isVerified;
    if (req.body.isFeatured !== undefined)
        updates.isFeatured = req.body.isFeatured;
    const brand = await brandRepository.update(brandId, updates);
    return sendSuccess(res, brand);
}));
/**
 * @route   DELETE /api/v1/admin/brands/:id
 * @desc    Delete brand
 * @access  Admin
 */
router.delete('/brands/:id', validate({ params: schemas.idParam }), asyncHandler(async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    await imageService.deleteAllImagesForEntity(brandId, 'brands');
    await brandRepository.delete(brandId);
    return sendNoContent(res);
}));
/**
 * @route   POST /api/v1/admin/brands/:id/image
 * @desc    Upload brand image
 * @access  Admin
 */
router.post('/brands/:id/image', upload.single('image'), asyncHandler(async (req, res) => {
    const brandId = parseInt(req.params.id, 10);
    if (!req.file) {
        return sendError(res, 'No image file provided', 400);
    }
    const result = await imageService.updateMainImage(req.file.buffer, 'brands', brandId);
    return sendCreated(res, result);
}));
// ==================== ORDERS ====================
/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get all orders
 * @access  Admin
 */
router.get('/orders', asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 20, status, customerId, startDate, endDate } = req.query;
    const result = await orderRepository.findAll({
        page: Number(page),
        pageSize: Number(pageSize),
        status: status,
        customerId: customerId ? Number(customerId) : undefined,
        startDate,
        endDate,
    });
    return sendPaginated(res, result.orders, { page: Number(page), pageSize: Number(pageSize), total: result.total });
}));
/**
 * @route   PUT /api/v1/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.put('/orders/:id/status', validate({
    params: schemas.idParam,
    body: schemas.orderStatusUpdate,
}), asyncHandler(async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const order = await orderRepository.updateStatus(orderId, status);
    return sendSuccess(res, order, 'Order status updated');
}));
/**
 * @route   GET /api/v1/admin/orders/statistics
 * @desc    Get order statistics
 * @access  Admin
 */
router.get('/orders/statistics', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const stats = await orderRepository.getStatistics({ startDate, endDate });
    return sendSuccess(res, stats);
}));
// ==================== CUSTOMERS ====================
/**
 * @route   GET /api/v1/admin/customers
 * @desc    Get all customers
 * @access  Admin
 */
router.get('/customers', asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 20, search } = req.query;
    const result = await customerRepository.findAll({
        page: Number(page),
        pageSize: Number(pageSize),
        search,
    });
    return sendPaginated(res, result.customers, { page: Number(page), pageSize: Number(pageSize), total: result.total });
}));
// ==================== REVIEWS ====================
/**
 * @route   GET /api/v1/admin/reviews
 * @desc    Get all reviews
 * @access  Admin
 */
router.get('/reviews', asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 20, productId, customerId } = req.query;
    const result = await reviewRepository.findAll({
        page: Number(page),
        pageSize: Number(pageSize),
        productId: productId ? Number(productId) : undefined,
        customerId: customerId ? Number(customerId) : undefined,
    });
    return sendPaginated(res, result.reviews, { page: Number(page), pageSize: Number(pageSize), total: result.total });
}));
/**
 * @route   DELETE /api/v1/admin/reviews/:id
 * @desc    Delete review
 * @access  Admin
 */
router.delete('/reviews/:id', validate({ params: schemas.idParam }), asyncHandler(async (req, res) => {
    const reviewId = parseInt(req.params.id, 10);
    await reviewRepository.delete(reviewId);
    return sendNoContent(res);
}));
// ==================== SHOP CONFIG ====================
/**
 * @route   PUT /api/v1/admin/shop/config
 * @desc    Update shop configuration
 * @access  Admin
 */
router.put('/shop/config', validate({ body: schemas.shopConfig }), asyncHandler(async (req, res) => {
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
    const config = await shopRepository.updateConfig(updates);
    return sendSuccess(res, config, 'Shop configuration updated');
}));
/**
 * @route   POST /api/v1/admin/app-versions
 * @desc    Create new app version
 * @access  Admin
 */
router.post('/app-versions', asyncHandler(async (req, res) => {
    const { version, forceUpdate, appLocked, redirectUrl, description } = req.body;
    if (!version || !redirectUrl) {
        return sendError(res, 'Version and redirectUrl are required', 400);
    }
    const appVersion = await shopRepository.createAppVersion({
        version,
        forceUpdate,
        appLocked,
        redirectUrl,
        description,
    });
    return sendCreated(res, appVersion);
}));
// ==================== IMAGES ====================
/**
 * @route   DELETE /api/v1/admin/images/:id
 * @desc    Delete an image
 * @access  Admin
 */
router.delete('/images/:id', validate({ params: schemas.idParam }), asyncHandler(async (req, res) => {
    const imageEntityId = parseInt(req.params.id, 10);
    await imageService.deleteImage(imageEntityId);
    return sendNoContent(res);
}));
export default router;
//# sourceMappingURL=index.js.map