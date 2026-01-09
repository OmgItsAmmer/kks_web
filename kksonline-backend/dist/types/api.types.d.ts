import type { Request } from 'express';
import type { Tables } from './database.types.js';
export type { SeverityLevel } from './database.types.js';
export interface AuthenticatedRequest extends Request {
    user?: AuthUser;
    customerId?: number;
}
export interface AuthUser {
    id: string;
    email: string;
    customerId: number;
    firstName: string;
    lastName: string | null;
    role: 'customer' | 'admin';
}
export interface JwtPayload {
    sub: string;
    email: string;
    customerId: number;
    firstName: string;
    lastName: string | null;
    role: 'customer' | 'admin';
    iat: number;
    exp: number;
}
export interface RefreshTokenPayload {
    sub: string;
    customerId: number;
    type: 'refresh';
    iat: number;
    exp: number;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    errorCode?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}
export interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name?: string;
    picture?: string;
}
export interface GoogleAuthRequest {
    idToken: string;
    fcmToken?: string;
}
export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
        id: string;
        email: string;
        customerId: number;
        firstName: string;
        lastName: string | null;
        profilePicture: string | null;
    };
}
export interface CartItem {
    variantId: number;
    quantity: number;
    sellPrice: number;
    buyPrice?: number;
}
export interface CartItemWithDetails extends CartItem {
    cartId: number;
    productId: number;
    productName: string;
    variantName: string;
    stock: number;
    isVisible: boolean;
    imageUrl?: string;
}
export interface CheckoutRequest {
    cartItems?: CartItem[];
    directCheckout?: {
        variantId: number;
        quantity: number;
        price: number;
    };
    addressId: number;
    shippingMethod: 'shipping' | 'pickup';
    paymentMethod: 'cod' | 'credit_card' | 'bank_transfer' | 'pickup' | 'jazzcash';
    idempotencyKey?: string;
}
export interface CheckoutTotals {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    cost: number;
}
export interface CheckoutResponse {
    success: boolean;
    orderId?: number;
    total?: number;
    message: string;
    errorCode?: string;
}
export interface ShopLimitValidationResult {
    allowed: boolean;
    canAddQuantity: number;
    maxAllowedQuantity: number;
    currentQuantity: number;
    remainingQuantity: number;
}
export interface CartStockValidation {
    cartId: number;
    variantId: number;
    requestedQuantity: number;
    availableStock: number;
    isValid: boolean;
    adjustedQuantity: number;
    shouldRemove: boolean;
    message: string;
}
export interface ProductWithDetails extends Tables<'products'> {
    category?: Tables<'categories'>;
    brand?: Tables<'brands'>;
    variants?: Tables<'product_variants'>[];
    images?: string[];
    mainImage?: string;
}
export interface OrderWithDetails extends Tables<'orders'> {
    items?: OrderItemWithProduct[];
    address?: Tables<'addresses'>;
    customer?: Pick<Tables<'customers'>, 'customer_id' | 'first_name' | 'last_name' | 'email' | 'phone_number'>;
}
export interface OrderItemWithProduct {
    productId: number;
    variantId: number;
    productName: string;
    variantName: string;
    quantity: number;
    price: number;
    imageUrl?: string;
}
export interface ImageUploadResponse {
    imageId: number;
    url: string;
    publicId: string;
    width: number;
    height: number;
}
export interface SearchParams {
    query?: string;
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
}
export declare const ErrorCodes: {
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly INVALID_TOKEN: "INVALID_TOKEN";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly ALREADY_EXISTS: "ALREADY_EXISTS";
    readonly CART_EMPTY: "CART_EMPTY";
    readonly DUPLICATE_ORDER: "DUPLICATE_ORDER";
    readonly INVENTORY_UNAVAILABLE: "INVENTORY_UNAVAILABLE";
    readonly PRICE_MISMATCH: "PRICE_MISMATCH";
    readonly SECURITY_VIOLATION: "SECURITY_VIOLATION";
    readonly SHIPPING_METHOD_INVALID: "SHIPPING_METHOD_INVALID";
    readonly PHONE_NUMBER_REQUIRED: "PHONE_NUMBER_REQUIRED";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly ORDER_CREATION_FAILED: "ORDER_CREATION_FAILED";
    readonly SHOP_LIMIT_EXCEEDED: "SHOP_LIMIT_EXCEEDED";
    readonly INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK";
    readonly ITEM_NOT_FOUND: "ITEM_NOT_FOUND";
    readonly VARIANT_NOT_FOUND: "VARIANT_NOT_FOUND";
    readonly ORDER_NOT_CANCELLABLE: "ORDER_NOT_CANCELLABLE";
    readonly INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
};
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
//# sourceMappingURL=api.types.d.ts.map