import type { Request } from 'express';

// Extended Request with customer identification
export interface CustomerRequest extends Request {
  customerId?: number;
}

// API Response types
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

// Cart types
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

// Checkout types
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

// Shop limit validation result
export interface ShopLimitValidationResult {
  allowed: boolean;
  canAddQuantity: number;
  maxAllowedQuantity: number;
  currentQuantity: number;
  remainingQuantity: number;
}

// Cart stock validation
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

// Product with relations
export interface ProductWithDetails {
  product_id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  brand_id: number | null;
  is_visible: boolean;
  is_popular: boolean;
  tags: string[] | null;
  created_at: Date;
  updated_at: Date;
  category?: {
    category_id: number;
    name: string;
  };
  brand?: {
    brand_id: number;
    name: string;
  };
  variants?: {
    variant_id: number;
    name: string;
    sell_price: number;
    buy_price: number;
    stock: number;
  }[];
  images?: string[];
  mainImage?: string;
}

// Order with details
export interface OrderWithDetails {
  order_id: number;
  customer_id: number;
  status: string;
  total_amount: number;
  shipping_method: string | null;
  payment_method: string | null;
  created_at: Date;
  updated_at: Date;
  items?: OrderItemWithProduct[];
  address?: {
    address_id: number;
    full_name: string;
    shipping_address: string;
    city: string;
    postal_code: string | null;
    phone_number: string | null;
    country: string | null;
  };
  customer?: {
    customer_id: number;
    first_name: string;
    last_name: string | null;
    email: string;
    phone_number: string | null;
  };
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

// Image upload response
export interface ImageUploadResponse {
  imageId: number;
  url: string;
  publicId: string;
  width: number;
  height: number;
}

// Search types
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

// Severity level for audit logs
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

// Error codes
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Cart/Checkout errors
  CART_EMPTY: 'CART_EMPTY',
  DUPLICATE_ORDER: 'DUPLICATE_ORDER',
  INVENTORY_UNAVAILABLE: 'INVENTORY_UNAVAILABLE',
  PRICE_MISMATCH: 'PRICE_MISMATCH',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  SHIPPING_METHOD_INVALID: 'SHIPPING_METHOD_INVALID',
  PHONE_NUMBER_REQUIRED: 'PHONE_NUMBER_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ORDER_CREATION_FAILED: 'ORDER_CREATION_FAILED',
  SHOP_LIMIT_EXCEEDED: 'SHOP_LIMIT_EXCEEDED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  VARIANT_NOT_FOUND: 'VARIANT_NOT_FOUND',
  
  // Order errors
  ORDER_NOT_CANCELLABLE: 'ORDER_NOT_CANCELLABLE',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
