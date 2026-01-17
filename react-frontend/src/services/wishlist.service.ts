import { apiRequest } from './api.config';

export interface WishlistItem {
    wishlistId: string;
    productId: number;
    productName: string;
    salePrice: string | null;
    basePrice: string | null;
    createdAt: string;
    imageUrl?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

class WishlistService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = '/wishlist';
    }

    /**
     * Get wishlist items
     */
    async getWishlist(): Promise<ApiResponse<WishlistItem[]>> {
        try {
            const response = await apiRequest<ApiResponse<WishlistItem[]>>(this.baseUrl, {
                method: 'GET',
            });
            return response;
        } catch (error) {
            console.error('[WishlistService] Error fetching wishlist:', error);
            throw error;
        }
    }

    /**
     * Add product to wishlist
     */
    async addToWishlist(productId: number): Promise<ApiResponse<any>> {
        try {
            const response = await apiRequest<ApiResponse<any>>(this.baseUrl, {
                method: 'POST',
                body: JSON.stringify({ productId }),
            });
            return response;
        } catch (error) {
            console.error('[WishlistService] Error adding to wishlist:', error);
            throw error;
        }
    }

    /**
     * Remove product from wishlist
     */
    async removeFromWishlist(productId: number): Promise<void> {
        try {
            await apiRequest<any>(`${this.baseUrl}/${productId}`, {
                method: 'DELETE',
            });
        } catch (error) {
            console.error('[WishlistService] Error removing from wishlist:', error);
            throw error;
        }
    }

    /**
     * Check if product is in wishlist
     */
    async checkWishlist(productId: number): Promise<ApiResponse<{ isInWishlist: boolean }>> {
        try {
            const response = await apiRequest<ApiResponse<{ isInWishlist: boolean }>>(
                `${this.baseUrl}/check/${productId}`,
                {
                    method: 'GET',
                }
            );
            return response;
        } catch (error) {
            console.error('[WishlistService] Error checking wishlist:', error);
            throw error;
        }
    }

    /**
     * Get wishlist count
     */
    async getWishlistCount(): Promise<ApiResponse<{ count: number }>> {
        try {
            const response = await apiRequest<ApiResponse<{ count: number }>>(
                `${this.baseUrl}/count`,
                {
                    method: 'GET',
                }
            );
            return response;
        } catch (error) {
            console.error('[WishlistService] Error getting wishlist count:', error);
            throw error;
        }
    }

    /**
     * Clear wishlist
     */
    async clearWishlist(): Promise<void> {
        try {
            await apiRequest<any>(this.baseUrl, {
                method: 'DELETE',
            });
        } catch (error) {
            console.error('[WishlistService] Error clearing wishlist:', error);
            throw error;
        }
    }
}

export const wishlistService = new WishlistService();
