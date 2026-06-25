import { apiRequest } from './api.config';
import type { CartSummary, CartValidationResponse, AddToCartRequest, UpdateCartRequest } from '../types/cart';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class CartService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/cart';
  }

  /**
   * Get cart items with full details (requires authentication)
   */
  async getCart(): Promise<CartSummary> {
    try {
      const response = await apiRequest<ApiResponse<CartSummary>>(this.baseUrl, {
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('[CartService] Error fetching cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart (requires authentication)
   */
  async addToCart(request: AddToCartRequest): Promise<void> {
    try {
      // Ensure variantId and quantity are numbers
      const payload = {
        variantId: Number(request.variantId),
        quantity: Number(request.quantity),
      };

      console.log('[CartService] Adding to cart:', payload);

      await apiRequest<ApiResponse<any>>(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error) {
      console.error('[CartService] Error adding to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(cartId: number, request: UpdateCartRequest): Promise<void> {
    try {
      await apiRequest<ApiResponse<any>>(`${this.baseUrl}/${cartId}`, {
        method: 'PUT',
        body: JSON.stringify(request),
      });
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error) {
      console.error('[CartService] Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(cartId: number): Promise<void> {
    try {
      await apiRequest<any>(`${this.baseUrl}/${cartId}`, {
        method: 'DELETE',
      });
      window.dispatchEvent(new CustomEvent('cart-updated'));
      // 204 No Content returns null, which is fine
    } catch (error) {
      console.error('[CartService] Error removing cart item:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<void> {
    try {
      await apiRequest<any>(this.baseUrl, {
        method: 'DELETE',
      });
      window.dispatchEvent(new CustomEvent('cart-updated'));
      // 204 No Content returns null, which is fine
    } catch (error) {
      console.error('[CartService] Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Validate cart stock
   */
  async validateCart(): Promise<CartValidationResponse> {
    try {
      const response = await apiRequest<ApiResponse<CartValidationResponse>>(`${this.baseUrl}/validate`, {
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('[CartService] Error validating cart:', error);
      throw error;
    }
  }

  /**
   * Apply cart stock adjustments
   */
  async applyAdjustments(adjustments: any[]): Promise<void> {
    try {
      await apiRequest<ApiResponse<any>>(`${this.baseUrl}/apply-adjustments`, {
        method: 'POST',
        body: JSON.stringify({ adjustments }),
      });
    } catch (error) {
      console.error('[CartService] Error applying adjustments:', error);
      throw error;
    }
  }

  /**
   * Get cart item count
   */
  async getCartCount(): Promise<number> {
    try {
      const response = await apiRequest<ApiResponse<{ count: number }>>(`${this.baseUrl}/count`, {
        method: 'GET',
      });
      return response.data.count;
    } catch (error) {
      console.error('[CartService] Error getting cart count:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const cartService = new CartService();
