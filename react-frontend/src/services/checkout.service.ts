import { apiRequest } from './api.config';

export interface CheckoutRequest {
  addressId: number;
  shippingMethod: 'shipping' | 'pickup';
  paymentMethod: 'cod' | 'jazzcash' | 'credit_card' | 'bank_transfer' | 'pickup';
  cartItems?: Array<{
    variantId: number;
    quantity: number;
    sellPrice: number;
    buyPrice?: number;
  }>;
  idempotencyKey?: string;
}

export interface CheckoutResponse {
  orderId: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class CheckoutService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/orders';
  }

  /**
   * Create order and complete checkout
   */
  async createOrder(request: CheckoutRequest): Promise<CheckoutResponse> {
    try {
      console.log('[CheckoutService] Creating order with:', request);
      const response = await apiRequest<ApiResponse<CheckoutResponse>>(`${this.baseUrl}/checkout`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response.data;
    } catch (error: any) {
      console.error('[CheckoutService] Error creating order:', error);
      
      // Extract validation errors if available
      if (error.status === 422 || error.statusCode === 422) {
        const validationError = new Error(error.message || 'Validation failed. Please check your input.');
        (validationError as any).status = 422;
        (validationError as any).errors = (error as any).errors;
        throw validationError;
      }
      
      throw error;
    }
  }

  /**
   * Get shop settings (tax rate, shipping fee, etc.)
   */
  async getShopSettings(): Promise<any> {
    try {
      const response = await apiRequest<ApiResponse<any>>('/shop', {
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('[CheckoutService] Error fetching shop settings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const checkoutService = new CheckoutService();
