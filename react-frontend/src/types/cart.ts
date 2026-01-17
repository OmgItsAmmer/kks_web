export interface CartItem {
  cartId: number;
  variantId: number;
  quantity: number;
  sellPrice: number;
  buyPrice?: number;
  productId: number;
  productName: string;
  variantName: string;
  stock: number;
  isVisible: boolean;
  imageUrl?: string;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
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

export interface CartValidationResponse {
  valid: boolean;
  adjustments: CartStockValidation[];
}

export interface AddToCartRequest {
  variantId: number;
  quantity: number;
}

export interface UpdateCartRequest {
  quantity: number;
}
