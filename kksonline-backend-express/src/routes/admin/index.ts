import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { productService } from '../../services/product.service';
import { productRepository } from '../../repositories/product.repository';
import { categoryRepository } from '../../repositories/category.repository';
import { brandRepository } from '../../repositories/brand.repository';
import { orderRepository } from '../../repositories/order.repository';
import { customerRepository } from '../../repositories/customer.repository';
import { reviewRepository } from '../../repositories/review.repository';
import { shopRepository } from '../../repositories/shop.repository';
import { imageService } from '../../services/image.service';
import { validate, schemas } from '../../middleware/validation.middleware';
import { asyncHandler } from '../../middleware/error.middleware';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated, sendError } from '../../utils/response';
import { z } from 'zod';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
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
router.get(
  '/products',
  validate({ query: schemas.pagination }),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const result = await productRepository.findAll({ page, pageSize, visibleOnly: false });

    return sendPaginated(res, result.products, { page, pageSize, total: result.total });
  })
);

/**
 * @route   POST /api/v1/admin/products
 * @desc    Create product
 * @access  Admin
 */
router.post(
  '/products',
  validate({ body: schemas.product }),
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.createProduct({
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

    return sendCreated(res, product, 'Product created successfully');
  })
);

/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Update product
 * @access  Admin
 */
router.put(
  '/products/:id',
  validate({
    params: schemas.idParam,
    body: schemas.product.partial(),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id!, 10);

    const product = await productService.updateProduct(productId, {
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

    return sendSuccess(res, product, 'Product updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Delete product
 * @access  Admin
 */
router.delete(
  '/products/:id',
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
  '/products/:id/visibility',
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
 * @route   POST /api/v1/admin/products/bulk-update
 * @desc    Bulk update products
 * @access  Admin
 */
router.post(
  '/products/bulk-update',
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
  '/products/bulk-delete',
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
 * @desc    Upload product image
 * @access  Admin
 */
router.post(
  '/products/:id/images',
  upload.single('image'),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id!, 10);
    const isFeatured = req.body.isFeatured === 'true';

    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    const result = isFeatured
      ? await imageService.updateMainImage(req.file.buffer, 'products', productId)
      : await imageService.addImage(req.file.buffer, 'products', productId);

    return sendCreated(res, result);
  })
);



// ==================== VARIANTS ====================

/**
 * @route   GET /api/v1/admin/products/:id/variants
 * @desc    Get all product variants (including hidden)
 * @access  Admin
 */
router.get(
  '/products/:id/variants',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id!, 10);

    const variants = await productRepository.getAllVariants(productId);

    return sendSuccess(res, variants);
  })
);

/**
 * @route   POST /api/v1/admin/products/:id/variants
 * @desc    Create product variant
 * @access  Admin
 */
router.post(
  '/products/:id/variants',
  validate({
    params: schemas.idParam,
    body: schemas.productVariant.omit({ productId: true }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id!, 10);

    const variant = await productService.createVariant({
      product_id: productId,
      variant_name: req.body.variantName,
      sell_price: req.body.sellPrice,
      buy_price: req.body.buyPrice,
      stock: req.body.stock,
      sku: req.body.sku,
      is_visible: req.body.isVisible,
      alert_stock: req.body.alertStock,
    });

    return sendCreated(res, variant, 'Variant created successfully');
  })
);

/**
 * @route   PUT /api/v1/admin/products/:id/variants/:variantId
 * @desc    Update product variant
 * @access  Admin
 */
router.put(
  '/products/:id/variants/:variantId',
  validate({
    params: z.object({
      id: z.string().transform(Number),
      variantId: z.string().transform(Number),
    }),
    body: schemas.productVariant.omit({ productId: true }).partial(),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const variantId = parseInt(req.params.variantId!, 10);

    const variant = await productService.updateVariant(variantId, {
      variant_name: req.body.variantName,
      sell_price: req.body.sellPrice,
      buy_price: req.body.buyPrice,
      stock: req.body.stock,
      sku: req.body.sku,
      is_visible: req.body.isVisible,
      alert_stock: req.body.alertStock,
    });

    return sendSuccess(res, variant, 'Variant updated successfully');
  })
);

/**
 * @route   DELETE /api/v1/admin/products/:id/variants/:variantId
 * @desc    Delete product variant
 * @access  Admin
 */
router.delete(
  '/products/:id/variants/:variantId',
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

// Legacy variant routes (for backward compatibility)
/**
 * @route   POST /api/v1/admin/variants
 * @desc    Create product variant (legacy)
 * @access  Admin
 */
router.post(
  '/variants',
  validate({ body: schemas.productVariant }),
  asyncHandler(async (req: Request, res: Response) => {
    const variant = await productService.createVariant({
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
  })
);

/**
 * @route   PUT /api/v1/admin/variants/:id
 * @desc    Update product variant (legacy)
 * @access  Admin
 */
router.put(
  '/variants/:id',
  validate({
    params: schemas.idParam,
    body: schemas.productVariant.partial(),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const variantId = parseInt(req.params.id!, 10);

    const variant = await productService.updateVariant(variantId, {
      variant_name: req.body.variantName,
      sell_price: req.body.sellPrice,
      buy_price: req.body.buyPrice,
      stock: req.body.stock,
      sku: req.body.sku,
      is_visible: req.body.isVisible,
      alert_stock: req.body.alertStock,
    });

    return sendSuccess(res, variant);
  })
);

/**
 * @route   DELETE /api/v1/admin/variants/:id
 * @desc    Delete product variant (legacy)
 * @access  Admin
 */
router.delete(
  '/variants/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const variantId = parseInt(req.params.id!, 10);

    await productService.deleteVariant(variantId);

    return sendNoContent(res);
  })
);


// ==================== CATEGORIES ====================

/**
 * @route   POST /api/v1/admin/categories
 * @desc    Create category
 * @access  Admin
 */
router.post(
  '/categories',
  validate({ body: schemas.category }),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryRepository.create({
      category_name: req.body.categoryName,
      isFeatured: req.body.isFeatured,
    });

    return sendCreated(res, category);
  })
);

/**
 * @route   PUT /api/v1/admin/categories/:id
 * @desc    Update category
 * @access  Admin
 */
router.put(
  '/categories/:id',
  validate({
    params: schemas.idParam,
    body: schemas.category.partial(),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id!, 10);

    const updates: Record<string, unknown> = {};
    if (req.body.categoryName !== undefined) updates.category_name = req.body.categoryName;
    if (req.body.isFeatured !== undefined) updates.isFeatured = req.body.isFeatured;

    const category = await categoryRepository.update(categoryId, updates);

    return sendSuccess(res, category);
  })
);

/**
 * @route   DELETE /api/v1/admin/categories/:id
 * @desc    Delete category
 * @access  Admin
 */
router.delete(
  '/categories/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id!, 10);

    await imageService.deleteAllImagesForEntity(categoryId, 'categories');
    await categoryRepository.delete(categoryId);

    return sendNoContent(res);
  })
);

/**
 * @route   POST /api/v1/admin/categories/:id/image
 * @desc    Upload category image
 * @access  Admin
 */
router.post(
  '/categories/:id/image',
  upload.single('image'),
  asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id!, 10);

    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    const result = await imageService.updateMainImage(req.file.buffer, 'categories', categoryId);

    return sendCreated(res, result);
  })
);

// ==================== BRANDS ====================

/**
 * @route   POST /api/v1/admin/brands
 * @desc    Create brand
 * @access  Admin
 */
router.post(
  '/brands',
  validate({ body: schemas.brand }),
  asyncHandler(async (req: Request, res: Response) => {
    const brand = await brandRepository.create({
      brandname: req.body.brandname,
      isVerified: req.body.isVerified,
      isFeatured: req.body.isFeatured,
    });

    return sendCreated(res, brand);
  })
);

/**
 * @route   PUT /api/v1/admin/brands/:id
 * @desc    Update brand
 * @access  Admin
 */
router.put(
  '/brands/:id',
  validate({
    params: schemas.idParam,
    body: schemas.brand.partial(),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const brandId = parseInt(req.params.id!, 10);

    const updates: Record<string, unknown> = {};
    if (req.body.brandname !== undefined) updates.brandname = req.body.brandname;
    if (req.body.isVerified !== undefined) updates.isVerified = req.body.isVerified;
    if (req.body.isFeatured !== undefined) updates.isFeatured = req.body.isFeatured;

    const brand = await brandRepository.update(brandId, updates);

    return sendSuccess(res, brand);
  })
);

/**
 * @route   DELETE /api/v1/admin/brands/:id
 * @desc    Delete brand
 * @access  Admin
 */
router.delete(
  '/brands/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const brandId = parseInt(req.params.id!, 10);

    await imageService.deleteAllImagesForEntity(brandId, 'brands');
    await brandRepository.delete(brandId);

    return sendNoContent(res);
  })
);

/**
 * @route   POST /api/v1/admin/brands/:id/image
 * @desc    Upload brand image
 * @access  Admin
 */
router.post(
  '/brands/:id/image',
  upload.single('image'),
  asyncHandler(async (req: Request, res: Response) => {
    const brandId = parseInt(req.params.id!, 10);

    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    const result = await imageService.updateMainImage(req.file.buffer, 'brands', brandId);

    return sendCreated(res, result);
  })
);

// ==================== ORDERS ====================

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get all orders
 * @access  Admin
 */
router.get(
  '/orders',
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 20, status, customerId, startDate, endDate } = req.query as {
      page?: number;
      pageSize?: number;
      status?: string;
      customerId?: number;
      startDate?: string;
      endDate?: string;
    };

    const result = await orderRepository.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      status: status as 'pending' | 'ready' | 'confirmed' | 'cancelled' | 'delivered' | 'processing' | 'completed',
      customerId: customerId ? Number(customerId) : undefined,
      startDate,
      endDate,
    });

    return sendPaginated(res, result.orders, { page: Number(page), pageSize: Number(pageSize), total: result.total });
  })
);

/**
 * @route   PUT /api/v1/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 */
router.put(
  '/orders/:id/status',
  validate({
    params: schemas.idParam,
    body: schemas.orderStatusUpdate,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id!, 10);
    const { status } = req.body;

    const order = await orderRepository.updateStatus(orderId, status);

    return sendSuccess(res, order, 'Order status updated');
  })
);

/**
 * @route   GET /api/v1/admin/orders/statistics
 * @desc    Get order statistics
 * @access  Admin
 */
router.get(
  '/orders/statistics',
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const stats = await orderRepository.getStatistics({ startDate, endDate });

    return sendSuccess(res, stats);
  })
);

// ==================== CUSTOMERS ====================

/**
 * @route   GET /api/v1/admin/customers
 * @desc    Get all customers
 * @access  Admin
 */
router.get(
  '/customers',
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 20, search } = req.query as {
      page?: number;
      pageSize?: number;
      search?: string;
    };

    const result = await customerRepository.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
    });

    return sendPaginated(res, result.customers, { page: Number(page), pageSize: Number(pageSize), total: result.total });
  })
);

// ==================== REVIEWS ====================

/**
 * @route   GET /api/v1/admin/reviews
 * @desc    Get all reviews
 * @access  Admin
 */
router.get(
  '/reviews',
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 20, productId, customerId } = req.query as {
      page?: number;
      pageSize?: number;
      productId?: number;
      customerId?: number;
    };

    const result = await reviewRepository.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      productId: productId ? Number(productId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
    });

    return sendPaginated(res, result.reviews, { page: Number(page), pageSize: Number(pageSize), total: result.total });
  })
);

/**
 * @route   DELETE /api/v1/admin/reviews/:id
 * @desc    Delete review
 * @access  Admin
 */
router.delete(
  '/reviews/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const reviewId = BigInt(req.params.id!);

    await reviewRepository.delete(reviewId);

    return sendNoContent(res);
  })
);

// ==================== SHOP CONFIG ====================

/**
 * @route   PUT /api/v1/admin/shop/config
 * @desc    Update shop configuration
 * @access  Admin
 */
router.put(
  '/shop/config',
  validate({ body: schemas.shopConfig }),
  asyncHandler(async (req: Request, res: Response) => {
    const updates: Record<string, unknown> = {};
    if (req.body.shopname !== undefined) updates.shopname = req.body.shopname;
    if (req.body.taxrate !== undefined) updates.taxrate = req.body.taxrate;
    if (req.body.shippingPrice !== undefined) updates.shipping_price = req.body.shippingPrice;
    if (req.body.thresholdFreeShipping !== undefined) updates.threshold_free_shipping = req.body.thresholdFreeShipping;
    if (req.body.isShippingEnable !== undefined) updates.is_shipping_enable = req.body.isShippingEnable;
    if (req.body.maxAllowedItemQuantity !== undefined) updates.max_allowed_item_quantity = req.body.maxAllowedItemQuantity;

    const config = await shopRepository.updateConfig(updates);

    return sendSuccess(res, config, 'Shop configuration updated');
  })
);

/**
 * @route   POST /api/v1/admin/app-versions
 * @desc    Create new app version
 * @access  Admin
 */
router.post(
  '/app-versions',
  asyncHandler(async (req: Request, res: Response) => {
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
  })
);

// ==================== IMAGES ====================

/**
 * @route   DELETE /api/v1/admin/images/:id
 * @desc    Delete an image
 * @access  Admin
 */
router.delete(
  '/images/:id',
  validate({ params: schemas.idParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const imageEntityId = parseInt(req.params.id!, 10);

    await imageService.deleteImage(imageEntityId);

    return sendNoContent(res);
  })
);

export default router;
