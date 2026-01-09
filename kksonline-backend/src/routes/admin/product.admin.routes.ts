import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { productService } from '../../services/product.service.ts';
import { productRepository } from '../../repositories/product.repository.ts';
import { imageService } from '../../services/image.service.ts';
import { validate, schemas } from '../../middleware/validation.middleware.ts';
import { asyncHandler } from '../../middleware/error.middleware.ts';
import { sendSuccess, sendCreated, sendNotFound } from '../../utils/response.ts';

const router = Router();

/**
 * @route   POST /api/v1/admin/products
 * @desc    Create a new product
 * @access  Admin
 */
router.post(
    '/',
    validate({ body: schemas.product }),
    asyncHandler(async (req: Request, res: Response) => {
        const { name, description, basePrice, salePrice, categoryId, brandID, ispopular, isVisible, tag, stockQuantity, alertStock } = req.body;

        const product = await productService.createProduct({
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

        return sendCreated(res, product, 'Product created successfully');
    })
);

/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Update a product
 * @access  Admin
 */
router.put(
    '/:id',
    validate({
        params: schemas.idParam,
        body: schemas.product.partial(),
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.id!, 10);
        const { name, description, basePrice, salePrice, categoryId, brandID, ispopular, isVisible, tag, stockQuantity, alertStock } = req.body;

        const product = await productService.updateProduct(productId, {
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

        return sendSuccess(res, product, 'Product updated successfully');
    })
);

/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Delete a product
 * @access  Admin
 */
router.delete(
    '/:id',
    validate({ params: schemas.idParam }),
    asyncHandler(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.id!, 10);

        await productService.deleteProduct(productId);

        return sendSuccess(res, null, 'Product deleted successfully');
    })
);

/**
 * @route   PATCH /api/v1/admin/products/:id/visibility
 * @desc    Toggle product visibility
 * @access  Admin
 */
router.patch(
    '/:id/visibility',
    validate({
        params: schemas.idParam,
        body: z.object({ isVisible: z.boolean() }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.id!, 10);
        const { isVisible } = req.body;

        const product = await productService.toggleVisibility(productId, isVisible);

        return sendSuccess(res, product, 'Product visibility updated');
    })
);

/**
 * @route   GET /api/v1/admin/products/:id/variants
 * @desc    Get all product variants (including hidden)
 * @access  Admin
 */
router.get(
    '/:id/variants',
    validate({ params: schemas.idParam }),
    asyncHandler(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.id!, 10);

        const variants = await productRepository.getAllVariants(productId);

        return sendSuccess(res, variants);
    })
);

/**
 * @route   POST /api/v1/admin/products/:id/variants
 * @desc    Create a product variant
 * @access  Admin
 */
router.post(
    '/:id/variants',
    validate({
        params: schemas.idParam,
        body: schemas.productVariant.omit({ productId: true }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.id!, 10);
        const { variantName, sellPrice, buyPrice, stock, sku, isVisible, alertStock } = req.body;

        const variant = await productService.createVariant({
            product_id: productId,
            variant_name: variantName,
            sell_price: sellPrice,
            buy_price: buyPrice,
            stock,
            sku,
            is_visible: isVisible,
            alert_stock: alertStock,
        });

        return sendCreated(res, variant, 'Variant created successfully');
    })
);

/**
 * @route   PUT /api/v1/admin/products/:id/variants/:variantId
 * @desc    Update a product variant
 * @access  Admin
 */
router.put(
    '/:id/variants/:variantId',
    validate({
        params: z.object({
            id: z.string().transform(Number),
            variantId: z.string().transform(Number),
        }),
        body: schemas.productVariant.omit({ productId: true }).partial(),
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const variantId = parseInt(req.params.variantId!, 10);
        const { variantName, sellPrice, buyPrice, stock, sku, isVisible, alertStock } = req.body;

        const variant = await productService.updateVariant(variantId, {
            variant_name: variantName,
            sell_price: sellPrice,
            buy_price: buyPrice,
            stock,
            sku,
            is_visible: isVisible,
            alert_stock: alertStock,
        });

        return sendSuccess(res, variant, 'Variant updated successfully');
    })
);

/**
 * @route   DELETE /api/v1/admin/products/:id/variants/:variantId
 * @desc    Delete a product variant
 * @access  Admin
 */
router.delete(
    '/:id/variants/:variantId',
    validate({
        params: z.object({
            id: z.string().transform(Number),
            variantId: z.string().transform(Number),
        }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const variantId = parseInt(req.params.variantId!, 10);

        await productService.deleteVariant(variantId);

        return sendSuccess(res, null, 'Variant deleted successfully');
    })
);

/**
 * @route   POST /api/v1/admin/products/bulk-update
 * @desc    Bulk update products
 * @access  Admin
 */
router.post(
    '/bulk-update',
    validate({
        body: z.object({
            productIds: z.array(z.number().int().positive()),
            updates: schemas.product.partial(),
        }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const { productIds, updates } = req.body;

        const result = await productService.bulkUpdateProducts(productIds, {
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

        return sendSuccess(res, result, 'Bulk update completed');
    })
);

/**
 * @route   POST /api/v1/admin/products/bulk-delete
 * @desc    Bulk delete products
 * @access  Admin
 */
router.post(
    '/bulk-delete',
    validate({
        body: z.object({
            productIds: z.array(z.number().int().positive()),
        }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const { productIds } = req.body;

        const result = await productService.bulkDeleteProducts(productIds);

        return sendSuccess(res, result, 'Bulk delete completed');
    })
);

/**
 * @route   POST /api/v1/admin/products/:id/images
 * @desc    Upload product images
 * @access  Admin
 */
router.post(
    '/:id/images',
    validate({ params: schemas.idParam }),
    asyncHandler(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.id!, 10);

        // Check if product exists
        const product = await productRepository.findById(productId);
        if (!product) {
            return sendNotFound(res, 'Product not found');
        }

        // Image upload would be handled by multer middleware and imageService
        // This is a placeholder for the actual implementation
        const { imageUrls } = req.body as { imageUrls: string[] };

        const uploadedImages = [];
        for (const imageUrl of imageUrls) {
            const image = await imageService.createImageEntity(imageUrl, productId, 'products', false);
            uploadedImages.push(image);
        }

        return sendSuccess(res, uploadedImages, 'Images uploaded successfully');
    })
);

/**
 * @route   DELETE /api/v1/admin/products/:id/images/:imageId
 * @desc    Delete a product image
 * @access  Admin
 */
router.delete(
    '/:id/images/:imageId',
    validate({
        params: z.object({
            id: z.string().transform(Number),
            imageId: z.string().transform(Number),
        }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.id!, 10);
        const imageId = parseInt(req.params.imageId!, 10);

        await imageService.deleteImage(imageId);

        return sendSuccess(res, null, 'Image deleted successfully');
    })
);

/**
 * @route   PATCH /api/v1/admin/products/:id/images/:imageId/featured
 * @desc    Set main/featured image for product
 * @access  Admin
 */
router.patch(
    '/:id/images/:imageId/featured',
    validate({
        params: z.object({
            id: z.string().transform(Number),
            imageId: z.string().transform(Number),
        }),
    }),
    asyncHandler(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.id!, 10);
        const imageId = parseInt(req.params.imageId!, 10);

        await imageService.setMainImage(imageId, productId, 'products');

        return sendSuccess(res, null, 'Featured image updated successfully');
    })
);

export default router;
