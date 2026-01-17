import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from "../utils/errors";

/**
 * Validation middleware factory using Zod schemas
 */
export const validate = (schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const errors: Record<string, string[]> = {};

      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) {
          errors.body = result.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          );
        } else {
          req.body = result.data;
        }
      }

      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) {
          errors.query = result.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          );
        } else {
          req.query = result.data;
        }
      }

      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) {
          errors.params = result.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          );
        } else {
          req.params = result.data;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Common validation schemas
export const schemas = {
  // Pagination
  pagination: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    pageSize: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  }),

  // ID parameter
  idParam: z.object({
    id: z.string().transform((val) => parseInt(val, 10)),
  }),

  // Search query
  searchQuery: z.object({
    q: z.string().min(1).max(100).optional(),
    categoryId: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
    brandId: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
    minPrice: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
    maxPrice: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
    isPopular: z.string().optional().transform((val) => val === 'true'),
    tag: z.string().optional(),
    sortBy: z.enum(['name', 'price', 'created_at', 'popularity']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    pageSize: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  }),

  // Google auth
  googleAuth: z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
    fcmToken: z.string().optional(),
  }),

  // Refresh token
  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),

  // Customer profile update
  customerUpdate: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().max(100).optional(),
    phoneNumber: z.string().regex(/^03[0-9]{9}$/, 'Invalid phone number format').optional(),
    cnic: z.string().regex(/^[0-9]{13}$/, 'CNIC must be 13 digits').optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    dob: z.string().datetime().optional(),
  }),

  // Address
  address: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    shippingAddress: z.string().optional(), // Optional when using Google Maps formatted_address
    city: z.string().optional(), // Optional when using Google Maps address components
    postalCode: z.string().min(3).max(12).optional(),
    phoneNumber: z.string().regex(/^03[0-9]{9}$/, 'Invalid phone number format'),
    country: z.string().default('Pakistan'),
    // Google Maps fields
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    place_id: z.string().optional(),
    formatted_address: z.string().optional(),
  }),

  // Cart item
  cartItem: z.object({
    variantId: z.number().int().positive(),
    quantity: z.number().int().positive().max(100),
  }),

  // Cart update
  cartUpdate: z.object({
    quantity: z.number().int().positive().max(100),
  }),

  // Checkout
  checkout: z.object({
    cartItems: z.array(z.object({
      variantId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      sellPrice: z.number().positive(),
      buyPrice: z.number().optional(),
    })).optional(),
    directCheckout: z.object({
      variantId: z.number().int().positive(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    }).optional(),
    addressId: z.number().int(),
    shippingMethod: z.enum(['shipping', 'pickup']),
    paymentMethod: z.enum(['cod', 'credit_card', 'bank_transfer', 'pickup', 'jazzcash']),
    idempotencyKey: z.string().optional(),
  }),

  // Review
  review: z.object({
    productId: z.number().int().positive(),
    rating: z.number().min(1).max(5),
    review: z.string().max(1000).optional(),
  }),

  // Wishlist
  wishlist: z.object({
    productId: z.number().int().positive(),
  }),

  // Product (admin)
  product: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    basePrice: z.string().optional(),
    salePrice: z.string().optional(),
    categoryId: z.number().int().positive().optional(),
    brandID: z.number().int().positive().optional(),
    ispopular: z.boolean().optional(),
    isVisible: z.boolean().optional(),
    tag: z.enum(['CHOICE', 'RECOMMENDED', 'TRENDING', 'hotSeller', 'flashSale', 'newArrival', 'AUTHENTIC']).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    alertStock: z.number().int().min(0).optional(),
  }),

  // Product variant (admin)
  productVariant: z.object({
    productId: z.number().int().positive(),
    variantName: z.string().min(1).max(255),
    sellPrice: z.number().positive(),
    buyPrice: z.number().min(0),
    stock: z.number().int().min(0),
    sku: z.string().optional(),
    isVisible: z.boolean().optional().default(true),
    alertStock: z.number().int().min(0).optional().default(0),
  }),

  // Category (admin)
  category: z.object({
    categoryName: z.string().min(1).max(100),
    isFeatured: z.boolean().optional().default(false),
  }),

  // Brand (admin)
  brand: z.object({
    brandname: z.string().min(1).max(100),
    isVerified: z.boolean().optional().default(false),
    isFeatured: z.boolean().optional().default(false),
  }),

  // Order status update (admin)
  orderStatusUpdate: z.object({
    status: z.enum(['pending', 'ready', 'confirmed', 'cancelled', 'delivered', 'processing', 'completed']),
  }),

  // Shop config (admin)
  shopConfig: z.object({
    shopname: z.string().optional(),
    taxrate: z.number().min(0).optional(),
    shippingPrice: z.number().min(0).optional(),
    thresholdFreeShipping: z.number().min(0).optional(),
    isShippingEnable: z.boolean().optional(),
    maxAllowedItemQuantity: z.number().int().positive().optional(),
  }),

  // Coupon (admin)
  coupon: z.object({
    title: z.string().min(1).max(100),
    couponCode: z.string().min(1).max(50),
    discountType: z.enum(['percentage', 'fixed']),
    amount: z.number().min(0),
    usageLimit: z.number().int().positive().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    isActive: z.boolean().optional().default(true),
  }),

  // Discount (admin)
  productDiscount: z.object({
    productId: z.number().int().positive(),
    discountType: z.enum(['percentage', 'fixed']),
    amount: z.number().min(0),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    isActive: z.boolean().optional().default(true),
  }),
};

