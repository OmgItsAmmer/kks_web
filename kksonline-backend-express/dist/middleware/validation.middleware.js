"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.validate = void 0;
const zod_1 = require("zod");
const errors_ts_1 = require("../utils/errors.ts");
/**
 * Validation middleware factory using Zod schemas
 */
const validate = (schema) => {
    return (req, _res, next) => {
        try {
            const errors = {};
            if (schema.body) {
                const result = schema.body.safeParse(req.body);
                if (!result.success) {
                    errors.body = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
                }
                else {
                    req.body = result.data;
                }
            }
            if (schema.query) {
                const result = schema.query.safeParse(req.query);
                if (!result.success) {
                    errors.query = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
                }
                else {
                    req.query = result.data;
                }
            }
            if (schema.params) {
                const result = schema.params.safeParse(req.params);
                if (!result.success) {
                    errors.params = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
                }
                else {
                    req.params = result.data;
                }
            }
            if (Object.keys(errors).length > 0) {
                throw new errors_ts_1.ValidationError('Validation failed', errors);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validate = validate;
// Common validation schemas
exports.schemas = {
    // Pagination
    pagination: zod_1.z.object({
        page: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
        pageSize: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    }),
    // ID parameter
    idParam: zod_1.z.object({
        id: zod_1.z.string().transform((val) => parseInt(val, 10)),
    }),
    // Search query
    searchQuery: zod_1.z.object({
        q: zod_1.z.string().min(1).max(100).optional(),
        categoryId: zod_1.z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
        brandId: zod_1.z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
        minPrice: zod_1.z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
        maxPrice: zod_1.z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
        isPopular: zod_1.z.string().optional().transform((val) => val === 'true'),
        tag: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['name', 'price', 'created_at', 'popularity']).optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('asc'),
        page: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
        pageSize: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    }),
    // Google auth
    googleAuth: zod_1.z.object({
        idToken: zod_1.z.string().min(1, 'Google ID token is required'),
        fcmToken: zod_1.z.string().optional(),
    }),
    // Refresh token
    refreshToken: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
    }),
    // Customer profile update
    customerUpdate: zod_1.z.object({
        firstName: zod_1.z.string().min(1).max(100).optional(),
        lastName: zod_1.z.string().max(100).optional(),
        phoneNumber: zod_1.z.string().regex(/^03[0-9]{9}$/, 'Invalid phone number format').optional(),
        cnic: zod_1.z.string().regex(/^[0-9]{13}$/, 'CNIC must be 13 digits').optional(),
        gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
        dob: zod_1.z.string().datetime().optional(),
    }),
    // Address
    address: zod_1.z.object({
        fullName: zod_1.z.string().min(1, 'Full name is required'),
        shippingAddress: zod_1.z.string().optional(), // Optional when using Google Maps formatted_address
        city: zod_1.z.string().optional(), // Optional when using Google Maps address components
        postalCode: zod_1.z.string().min(3).max(12).optional(),
        phoneNumber: zod_1.z.string().regex(/^03[0-9]{9}$/, 'Invalid phone number format'),
        country: zod_1.z.string().default('Pakistan'),
        // Google Maps fields
        latitude: zod_1.z.number().min(-90).max(90).optional(),
        longitude: zod_1.z.number().min(-180).max(180).optional(),
        place_id: zod_1.z.string().optional(),
        formatted_address: zod_1.z.string().optional(),
    }),
    // Cart item
    cartItem: zod_1.z.object({
        variantId: zod_1.z.number().int().positive(),
        quantity: zod_1.z.number().int().positive().max(100),
    }),
    // Cart update
    cartUpdate: zod_1.z.object({
        quantity: zod_1.z.number().int().positive().max(100),
    }),
    // Checkout
    checkout: zod_1.z.object({
        cartItems: zod_1.z.array(zod_1.z.object({
            variantId: zod_1.z.number().int().positive(),
            quantity: zod_1.z.number().int().positive(),
            sellPrice: zod_1.z.number().positive(),
            buyPrice: zod_1.z.number().optional(),
        })).optional(),
        directCheckout: zod_1.z.object({
            variantId: zod_1.z.number().int().positive(),
            quantity: zod_1.z.number().int().positive(),
            price: zod_1.z.number().positive(),
        }).optional(),
        addressId: zod_1.z.number().int(),
        shippingMethod: zod_1.z.enum(['shipping', 'pickup']),
        paymentMethod: zod_1.z.enum(['cod', 'credit_card', 'bank_transfer', 'pickup', 'jazzcash']),
        idempotencyKey: zod_1.z.string().optional(),
    }),
    // Review
    review: zod_1.z.object({
        productId: zod_1.z.number().int().positive(),
        rating: zod_1.z.number().min(1).max(5),
        review: zod_1.z.string().max(1000).optional(),
    }),
    // Wishlist
    wishlist: zod_1.z.object({
        productId: zod_1.z.number().int().positive(),
    }),
    // Product (admin)
    product: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255),
        description: zod_1.z.string().optional(),
        basePrice: zod_1.z.string().optional(),
        salePrice: zod_1.z.string().optional(),
        categoryId: zod_1.z.number().int().positive().optional(),
        brandID: zod_1.z.number().int().positive().optional(),
        ispopular: zod_1.z.boolean().optional(),
        isVisible: zod_1.z.boolean().optional(),
        tag: zod_1.z.enum(['CHOICE', 'RECOMMENDED', 'TRENDING', 'hotSeller', 'flashSale', 'newArrival', 'AUTHENTIC']).optional(),
        stockQuantity: zod_1.z.number().int().min(0).optional(),
        alertStock: zod_1.z.number().int().min(0).optional(),
    }),
    // Product variant (admin)
    productVariant: zod_1.z.object({
        productId: zod_1.z.number().int().positive(),
        variantName: zod_1.z.string().min(1).max(255),
        sellPrice: zod_1.z.number().positive(),
        buyPrice: zod_1.z.number().min(0),
        stock: zod_1.z.number().int().min(0),
        sku: zod_1.z.string().optional(),
        isVisible: zod_1.z.boolean().optional().default(true),
        alertStock: zod_1.z.number().int().min(0).optional().default(0),
    }),
    // Category (admin)
    category: zod_1.z.object({
        categoryName: zod_1.z.string().min(1).max(100),
        isFeatured: zod_1.z.boolean().optional().default(false),
    }),
    // Brand (admin)
    brand: zod_1.z.object({
        brandname: zod_1.z.string().min(1).max(100),
        isVerified: zod_1.z.boolean().optional().default(false),
        isFeatured: zod_1.z.boolean().optional().default(false),
    }),
    // Order status update (admin)
    orderStatusUpdate: zod_1.z.object({
        status: zod_1.z.enum(['pending', 'ready', 'confirmed', 'cancelled', 'delivered', 'processing', 'completed']),
    }),
    // Shop config (admin)
    shopConfig: zod_1.z.object({
        shopname: zod_1.z.string().optional(),
        taxrate: zod_1.z.number().min(0).optional(),
        shippingPrice: zod_1.z.number().min(0).optional(),
        thresholdFreeShipping: zod_1.z.number().min(0).optional(),
        isShippingEnable: zod_1.z.boolean().optional(),
        maxAllowedItemQuantity: zod_1.z.number().int().positive().optional(),
    }),
    // Coupon (admin)
    coupon: zod_1.z.object({
        title: zod_1.z.string().min(1).max(100),
        couponCode: zod_1.z.string().min(1).max(50),
        discountType: zod_1.z.enum(['percentage', 'fixed']),
        amount: zod_1.z.number().min(0),
        usageLimit: zod_1.z.number().int().positive().optional(),
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime(),
        isActive: zod_1.z.boolean().optional().default(true),
    }),
    // Discount (admin)
    productDiscount: zod_1.z.object({
        productId: zod_1.z.number().int().positive(),
        discountType: zod_1.z.enum(['percentage', 'fixed']),
        amount: zod_1.z.number().min(0),
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime(),
        isActive: zod_1.z.boolean().optional().default(true),
    }),
};
//# sourceMappingURL=validation.middleware.js.map