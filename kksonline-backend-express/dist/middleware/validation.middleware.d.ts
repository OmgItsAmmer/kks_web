import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
/**
 * Validation middleware factory using Zod schemas
 */
export declare const validate: (schema: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
}) => (req: Request, _res: Response, next: NextFunction) => void;
export declare const schemas: {
    pagination: z.ZodObject<{
        page: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
        pageSize: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        pageSize: number;
    }, {
        page?: string | undefined;
        pageSize?: string | undefined;
    }>;
    idParam: z.ZodObject<{
        id: z.ZodEffects<z.ZodString, number, string>;
    }, "strip", z.ZodTypeAny, {
        id: number;
    }, {
        id: string;
    }>;
    searchQuery: z.ZodObject<{
        q: z.ZodOptional<z.ZodString>;
        categoryId: z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>;
        brandId: z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>;
        minPrice: z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>;
        maxPrice: z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>;
        isPopular: z.ZodEffects<z.ZodOptional<z.ZodString>, boolean, string | undefined>;
        tag: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodEnum<["name", "price", "created_at", "popularity"]>>;
        sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
        page: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
        pageSize: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        pageSize: number;
        isPopular: boolean;
        sortOrder: "asc" | "desc";
        q?: string | undefined;
        categoryId?: number | undefined;
        brandId?: number | undefined;
        minPrice?: number | undefined;
        maxPrice?: number | undefined;
        tag?: string | undefined;
        sortBy?: "name" | "price" | "created_at" | "popularity" | undefined;
    }, {
        page?: string | undefined;
        pageSize?: string | undefined;
        q?: string | undefined;
        categoryId?: string | undefined;
        brandId?: string | undefined;
        minPrice?: string | undefined;
        maxPrice?: string | undefined;
        isPopular?: string | undefined;
        tag?: string | undefined;
        sortBy?: "name" | "price" | "created_at" | "popularity" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
    googleAuth: z.ZodObject<{
        idToken: z.ZodString;
        fcmToken: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        idToken: string;
        fcmToken?: string | undefined;
    }, {
        idToken: string;
        fcmToken?: string | undefined;
    }>;
    refreshToken: z.ZodObject<{
        refreshToken: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        refreshToken: string;
    }, {
        refreshToken: string;
    }>;
    customerUpdate: z.ZodObject<{
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
        phoneNumber: z.ZodOptional<z.ZodString>;
        cnic: z.ZodOptional<z.ZodString>;
        gender: z.ZodOptional<z.ZodEnum<["male", "female", "other"]>>;
        dob: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        cnic?: string | undefined;
        dob?: string | undefined;
        gender?: "other" | "male" | "female" | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phoneNumber?: string | undefined;
    }, {
        cnic?: string | undefined;
        dob?: string | undefined;
        gender?: "other" | "male" | "female" | undefined;
        firstName?: string | undefined;
        lastName?: string | undefined;
        phoneNumber?: string | undefined;
    }>;
    address: z.ZodObject<{
        fullName: z.ZodString;
        shippingAddress: z.ZodString;
        city: z.ZodString;
        postalCode: z.ZodOptional<z.ZodString>;
        phoneNumber: z.ZodString;
        country: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        city: string;
        country: string;
        phoneNumber: string;
        fullName: string;
        shippingAddress: string;
        postalCode?: string | undefined;
    }, {
        city: string;
        phoneNumber: string;
        fullName: string;
        shippingAddress: string;
        country?: string | undefined;
        postalCode?: string | undefined;
    }>;
    cartItem: z.ZodObject<{
        variantId: z.ZodNumber;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        variantId: number;
    }, {
        quantity: number;
        variantId: number;
    }>;
    cartUpdate: z.ZodObject<{
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
    }, {
        quantity: number;
    }>;
    checkout: z.ZodObject<{
        cartItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
            variantId: z.ZodNumber;
            quantity: z.ZodNumber;
            sellPrice: z.ZodNumber;
            buyPrice: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            quantity: number;
            variantId: number;
            sellPrice: number;
            buyPrice?: number | undefined;
        }, {
            quantity: number;
            variantId: number;
            sellPrice: number;
            buyPrice?: number | undefined;
        }>, "many">>;
        directCheckout: z.ZodOptional<z.ZodObject<{
            variantId: z.ZodNumber;
            quantity: z.ZodNumber;
            price: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            price: number;
            quantity: number;
            variantId: number;
        }, {
            price: number;
            quantity: number;
            variantId: number;
        }>>;
        addressId: z.ZodNumber;
        shippingMethod: z.ZodEnum<["shipping", "pickup"]>;
        paymentMethod: z.ZodEnum<["cod", "credit_card", "bank_transfer", "pickup", "jazzcash"]>;
        idempotencyKey: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        addressId: number;
        shippingMethod: "shipping" | "pickup";
        paymentMethod: "pickup" | "cod" | "credit_card" | "bank_transfer" | "jazzcash";
        cartItems?: {
            quantity: number;
            variantId: number;
            sellPrice: number;
            buyPrice?: number | undefined;
        }[] | undefined;
        directCheckout?: {
            price: number;
            quantity: number;
            variantId: number;
        } | undefined;
        idempotencyKey?: string | undefined;
    }, {
        addressId: number;
        shippingMethod: "shipping" | "pickup";
        paymentMethod: "pickup" | "cod" | "credit_card" | "bank_transfer" | "jazzcash";
        cartItems?: {
            quantity: number;
            variantId: number;
            sellPrice: number;
            buyPrice?: number | undefined;
        }[] | undefined;
        directCheckout?: {
            price: number;
            quantity: number;
            variantId: number;
        } | undefined;
        idempotencyKey?: string | undefined;
    }>;
    review: z.ZodObject<{
        productId: z.ZodNumber;
        rating: z.ZodNumber;
        review: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        rating: number;
        productId: number;
        review?: string | undefined;
    }, {
        rating: number;
        productId: number;
        review?: string | undefined;
    }>;
    wishlist: z.ZodObject<{
        productId: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        productId: number;
    }, {
        productId: number;
    }>;
    product: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        basePrice: z.ZodOptional<z.ZodString>;
        salePrice: z.ZodOptional<z.ZodString>;
        categoryId: z.ZodOptional<z.ZodNumber>;
        brandID: z.ZodOptional<z.ZodNumber>;
        ispopular: z.ZodOptional<z.ZodBoolean>;
        isVisible: z.ZodOptional<z.ZodBoolean>;
        tag: z.ZodOptional<z.ZodEnum<["CHOICE", "RECOMMENDED", "TRENDING", "hotSeller", "flashSale", "newArrival", "AUTHENTIC"]>>;
        stockQuantity: z.ZodOptional<z.ZodNumber>;
        alertStock: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        categoryId?: number | undefined;
        tag?: "CHOICE" | "RECOMMENDED" | "TRENDING" | "hotSeller" | "flashSale" | "newArrival" | "AUTHENTIC" | undefined;
        description?: string | undefined;
        basePrice?: string | undefined;
        salePrice?: string | undefined;
        brandID?: number | undefined;
        ispopular?: boolean | undefined;
        isVisible?: boolean | undefined;
        stockQuantity?: number | undefined;
        alertStock?: number | undefined;
    }, {
        name: string;
        categoryId?: number | undefined;
        tag?: "CHOICE" | "RECOMMENDED" | "TRENDING" | "hotSeller" | "flashSale" | "newArrival" | "AUTHENTIC" | undefined;
        description?: string | undefined;
        basePrice?: string | undefined;
        salePrice?: string | undefined;
        brandID?: number | undefined;
        ispopular?: boolean | undefined;
        isVisible?: boolean | undefined;
        stockQuantity?: number | undefined;
        alertStock?: number | undefined;
    }>;
    productVariant: z.ZodObject<{
        productId: z.ZodNumber;
        variantName: z.ZodString;
        sellPrice: z.ZodNumber;
        buyPrice: z.ZodNumber;
        stock: z.ZodNumber;
        sku: z.ZodOptional<z.ZodString>;
        isVisible: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        alertStock: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        sellPrice: number;
        buyPrice: number;
        productId: number;
        isVisible: boolean;
        alertStock: number;
        variantName: string;
        stock: number;
        sku?: string | undefined;
    }, {
        sellPrice: number;
        buyPrice: number;
        productId: number;
        variantName: string;
        stock: number;
        isVisible?: boolean | undefined;
        alertStock?: number | undefined;
        sku?: string | undefined;
    }>;
    category: z.ZodObject<{
        categoryName: z.ZodString;
        isFeatured: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        isFeatured: boolean;
        categoryName: string;
    }, {
        categoryName: string;
        isFeatured?: boolean | undefined;
    }>;
    brand: z.ZodObject<{
        brandname: z.ZodString;
        isVerified: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        isFeatured: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        isFeatured: boolean;
        brandname: string;
        isVerified: boolean;
    }, {
        brandname: string;
        isFeatured?: boolean | undefined;
        isVerified?: boolean | undefined;
    }>;
    orderStatusUpdate: z.ZodObject<{
        status: z.ZodEnum<["pending", "ready", "confirmed", "cancelled", "delivered", "processing", "completed"]>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "ready" | "confirmed" | "cancelled" | "delivered" | "processing" | "completed";
    }, {
        status: "pending" | "ready" | "confirmed" | "cancelled" | "delivered" | "processing" | "completed";
    }>;
    shopConfig: z.ZodObject<{
        shopname: z.ZodOptional<z.ZodString>;
        taxrate: z.ZodOptional<z.ZodNumber>;
        shippingPrice: z.ZodOptional<z.ZodNumber>;
        thresholdFreeShipping: z.ZodOptional<z.ZodNumber>;
        isShippingEnable: z.ZodOptional<z.ZodBoolean>;
        maxAllowedItemQuantity: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        shopname?: string | undefined;
        taxrate?: number | undefined;
        shippingPrice?: number | undefined;
        thresholdFreeShipping?: number | undefined;
        isShippingEnable?: boolean | undefined;
        maxAllowedItemQuantity?: number | undefined;
    }, {
        shopname?: string | undefined;
        taxrate?: number | undefined;
        shippingPrice?: number | undefined;
        thresholdFreeShipping?: number | undefined;
        isShippingEnable?: boolean | undefined;
        maxAllowedItemQuantity?: number | undefined;
    }>;
    coupon: z.ZodObject<{
        title: z.ZodString;
        couponCode: z.ZodString;
        discountType: z.ZodEnum<["percentage", "fixed"]>;
        amount: z.ZodNumber;
        usageLimit: z.ZodOptional<z.ZodNumber>;
        startDate: z.ZodString;
        endDate: z.ZodString;
        isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        couponCode: string;
        discountType: "fixed" | "percentage";
        amount: number;
        startDate: string;
        endDate: string;
        isActive: boolean;
        usageLimit?: number | undefined;
    }, {
        title: string;
        couponCode: string;
        discountType: "fixed" | "percentage";
        amount: number;
        startDate: string;
        endDate: string;
        usageLimit?: number | undefined;
        isActive?: boolean | undefined;
    }>;
    productDiscount: z.ZodObject<{
        productId: z.ZodNumber;
        discountType: z.ZodEnum<["percentage", "fixed"]>;
        amount: z.ZodNumber;
        startDate: z.ZodString;
        endDate: z.ZodString;
        isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        productId: number;
        discountType: "fixed" | "percentage";
        amount: number;
        startDate: string;
        endDate: string;
        isActive: boolean;
    }, {
        productId: number;
        discountType: "fixed" | "percentage";
        amount: number;
        startDate: string;
        endDate: string;
        isActive?: boolean | undefined;
    }>;
};
//# sourceMappingURL=validation.middleware.d.ts.map