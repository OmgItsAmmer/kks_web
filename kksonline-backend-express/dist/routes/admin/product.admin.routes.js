"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const product_service_1 = require("../../services/product.service");
const product_repository_1 = require("../../repositories/product.repository");
const image_service_1 = require("../../services/image.service");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const error_middleware_1 = require("../../middleware/error.middleware");
const response_1 = require("../../utils/response");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/v1/admin/products
 * @desc    Create a new product
 * @access  Admin
 */
router.post('/', (0, validation_middleware_1.validate)({ body: validation_middleware_1.schemas.product }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { name, description, basePrice, salePrice, categoryId, brandID, ispopular, isVisible, tag, stockQuantity, alertStock } = req.body;
    const product = await product_service_1.productService.createProduct({
        name,
        description,
        base_price: basePrice,
        sale_price: salePrice,
        category_id: categoryId,
        brandID,
        ispopular,
        isVisible,
        tag,
        stock_quantity: stockQuantity,
        alert_stock: alertStock,
    });
    return (0, response_1.sendCreated)(res, product, 'Product created successfully');
}));
/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Update a product
 * @access  Admin
 */
router.put('/:id', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: validation_middleware_1.schemas.product.partial(),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const { name, description, basePrice, salePrice, categoryId, brandID, ispopular, isVisible, tag, stockQuantity, alertStock } = req.body;
    const product = await product_service_1.productService.updateProduct(productId, {
        name,
        description,
        base_price: basePrice,
        sale_price: salePrice,
        category_id: categoryId,
        brandID,
        ispopular,
        isVisible,
        tag,
        stock_quantity: stockQuantity,
        alert_stock: alertStock,
    });
    return (0, response_1.sendSuccess)(res, product, 'Product updated successfully');
}));
/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Delete a product
 * @access  Admin
 */
router.delete('/:id', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    await product_service_1.productService.deleteProduct(productId);
    return (0, response_1.sendSuccess)(res, null, 'Product deleted successfully');
}));
/**
 * @route   PATCH /api/v1/admin/products/:id/visibility
 * @desc    Toggle product visibility
 * @access  Admin
 */
router.patch('/:id/visibility', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: zod_1.z.object({ isVisible: zod_1.z.boolean() }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const { isVisible } = req.body;
    const product = await product_service_1.productService.toggleVisibility(productId, isVisible);
    return (0, response_1.sendSuccess)(res, product, 'Product visibility updated');
}));
/**
 * @route   GET /api/v1/admin/products/:id/variants
 * @desc    Get all product variants (including hidden)
 * @access  Admin
 */
router.get('/:id/variants', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const variants = await product_repository_1.productRepository.getAllVariants(productId);
    return (0, response_1.sendSuccess)(res, variants);
}));
/**
 * @route   POST /api/v1/admin/products/:id/variants
 * @desc    Create a product variant
 * @access  Admin
 */
router.post('/:id/variants', (0, validation_middleware_1.validate)({
    params: validation_middleware_1.schemas.idParam,
    body: validation_middleware_1.schemas.productVariant.omit({ productId: true }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const { variantName, sellPrice, buyPrice, stock, sku, isVisible, alertStock } = req.body;
    const variant = await product_service_1.productService.createVariant({
        product_id: productId,
        variant_name: variantName,
        sell_price: sellPrice,
        buy_price: buyPrice,
        stock,
        sku,
        is_visible: isVisible,
        alert_stock: alertStock,
    });
    return (0, response_1.sendCreated)(res, variant, 'Variant created successfully');
}));
/**
 * @route   PUT /api/v1/admin/products/:id/variants/:variantId
 * @desc    Update a product variant
 * @access  Admin
 */
router.put('/:id/variants/:variantId', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({
        id: zod_1.z.string().transform(Number),
        variantId: zod_1.z.string().transform(Number),
    }),
    body: validation_middleware_1.schemas.productVariant.omit({ productId: true }).partial(),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const variantId = parseInt(req.params.variantId, 10);
    const { variantName, sellPrice, buyPrice, stock, sku, isVisible, alertStock } = req.body;
    const variant = await product_service_1.productService.updateVariant(variantId, {
        variant_name: variantName,
        sell_price: sellPrice,
        buy_price: buyPrice,
        stock,
        sku,
        is_visible: isVisible,
        alert_stock: alertStock,
    });
    return (0, response_1.sendSuccess)(res, variant, 'Variant updated successfully');
}));
/**
 * @route   DELETE /api/v1/admin/products/:id/variants/:variantId
 * @desc    Delete a product variant
 * @access  Admin
 */
router.delete('/:id/variants/:variantId', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({
        id: zod_1.z.string().transform(Number),
        variantId: zod_1.z.string().transform(Number),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const variantId = parseInt(req.params.variantId, 10);
    await product_service_1.productService.deleteVariant(variantId);
    return (0, response_1.sendSuccess)(res, null, 'Variant deleted successfully');
}));
/**
 * @route   POST /api/v1/admin/products/bulk-update
 * @desc    Bulk update products
 * @access  Admin
 */
router.post('/bulk-update', (0, validation_middleware_1.validate)({
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
router.post('/bulk-delete', (0, validation_middleware_1.validate)({
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
 * @desc    Upload product images
 * @access  Admin
 */
router.post('/:id/images', (0, validation_middleware_1.validate)({ params: validation_middleware_1.schemas.idParam }), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    // Check if product exists
    const product = await product_repository_1.productRepository.findById(productId);
    if (!product) {
        return (0, response_1.sendNotFound)(res, 'Product not found');
    }
    // Image upload would be handled by multer middleware and imageService
    // This is a placeholder for the actual implementation
    const { imageUrls } = req.body;
    // TODO: Implement proper image upload
    // const uploadedImages = [];
    // for (const imageUrl of imageUrls) {
    //     const image = await imageService.uploadFromBuffer(buffer, 'products', productId, false);
    //     uploadedImages.push(image);
    // }
    const uploadedImages = [];
    return (0, response_1.sendSuccess)(res, uploadedImages, 'Images uploaded successfully');
}));
/**
 * @route   DELETE /api/v1/admin/products/:id/images/:imageId
 * @desc    Delete a product image
 * @access  Admin
 */
router.delete('/:id/images/:imageId', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({
        id: zod_1.z.string().transform(Number),
        imageId: zod_1.z.string().transform(Number),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    await image_service_1.imageService.deleteImage(imageId);
    return (0, response_1.sendSuccess)(res, null, 'Image deleted successfully');
}));
/**
 * @route   PATCH /api/v1/admin/products/:id/images/:imageId/featured
 * @desc    Set main/featured image for product
 * @access  Admin
 */
router.patch('/:id/images/:imageId/featured', (0, validation_middleware_1.validate)({
    params: zod_1.z.object({
        id: zod_1.z.string().transform(Number),
        imageId: zod_1.z.string().transform(Number),
    }),
}), (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    await image_service_1.imageService.setFeaturedImage(imageId, productId, 'products');
    return (0, response_1.sendSuccess)(res, null, 'Featured image updated successfully');
}));
exports.default = router;
//# sourceMappingURL=product.admin.routes.js.map