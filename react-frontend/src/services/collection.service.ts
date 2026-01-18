import { apiRequest } from './api.config';
import API_ENDPOINTS from './api.config';

// Backend types for collections
export interface BackendCollection {
    collection_id: number;
    name: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    is_featured: boolean;
    is_premium?: boolean;
    display_order: number;
    created_at: Date;
    updated_at: Date;
    item_count: number;
    total_price: number;
}

export interface BackendCollectionItem {
    collection_item_id: number;
    variant_id: number;
    default_quantity: number;
    sort_order: number;
    product_id: number;
    product_name: string;
    variant_name: string | null;
    sell_price: number;
    stock: number;
    is_visible: boolean;
    sku: string | null;
    image_url: string | null;
    all_variants?: VariantOption[];
}

export interface VariantOption {
    variant_id: number;
    variant_name: string | null;
    sell_price: number;
    stock: number;
    sku: string | null;
    is_visible: boolean;
}

export interface BackendCollectionWithItems {
    collection_id: number;
    name: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    is_featured: boolean;
    display_order: number;
    created_at: Date;
    updated_at: Date;
    items: BackendCollectionItem[];
    total_price: number;
}

export interface CollectionCartItem {
    variant_id: number;
    quantity: number;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
}

class CollectionService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_ENDPOINTS.BASE_URL;
        console.log('[CollectionService] Service initialized');
        console.log('[CollectionService] Base URL:', this.baseUrl);
    }

    /**
     * Fetch all active collections with pagination
     */
    async getCollections(page = 1, pageSize = 10): Promise<PaginatedResponse<BackendCollection>> {
        try {
            const response = await apiRequest<PaginatedResponse<BackendCollection>>(
                `/collections?page=${page}&pageSize=${pageSize}`
            );
            return response;
        } catch (error) {
            console.error('[CollectionService] Error fetching collections:', error);
            throw error;
        }
    }

    /**
     * Fetch featured collections (for hero section)
     */
    async getFeaturedCollections(limit = 7): Promise<ApiResponse<BackendCollection[]>> {
        try {
            const response = await apiRequest<ApiResponse<BackendCollection[]>>(
                `/collections/featured?limit=${limit}`
            );
            return response;
        } catch (error) {
            console.error('[CollectionService] Error fetching featured collections:', error);
            throw error;
        }
    }

    /**
     * Fetch ONE premium collection (for main banner)
     */
    async getPremiumCollection(): Promise<ApiResponse<BackendCollection | null>> {
        try {
            const response = await apiRequest<ApiResponse<BackendCollection | null>>(
                `/collections/premium`
            );
            return response;
        } catch (error) {
            console.error('[CollectionService] Error fetching premium collection:', error);
            throw error;
        }
    }

    /**
     * Fetch standard collections (non-premium, for side/bottom cards)
     */
    async getStandardCollections(limit = 6): Promise<ApiResponse<BackendCollection[]>> {
        try {
            const response = await apiRequest<ApiResponse<BackendCollection[]>>(
                `/collections/standard?limit=${limit}`
            );
            return response;
        } catch (error) {
            console.error('[CollectionService] Error fetching standard collections:', error);
            throw error;
        }
    }

    /**
     * Fetch collection by ID with full details
     */
    async getCollectionById(collectionId: number): Promise<ApiResponse<BackendCollectionWithItems>> {
        try {
            const response = await apiRequest<ApiResponse<BackendCollectionWithItems>>(
                `/collections/${collectionId}`
            );
            return response;
        } catch (error) {
            console.error('[CollectionService] Error fetching collection by ID:', error);
            throw error;
        }
    }

    /**
     * Add collection to cart
     */
    async addToCart(
        collectionId: number,
        customerId: number,
        items: CollectionCartItem[]
    ): Promise<ApiResponse<any>> {
        try {
            const response = await apiRequest<ApiResponse<any>>(
                `/collections/${collectionId}/cart`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        customer_id: customerId,
                        items,
                    }),
                }
            );
            return response;
        } catch (error) {
            console.error('[CollectionService] Error adding collection to cart:', error);
            throw error;
        }
    }

    /**
     * Get customer's collection cart
     */
    async getCustomerCollectionCart(customerId: number): Promise<ApiResponse<any[]>> {
        try {
            const response = await apiRequest<ApiResponse<any[]>>(
                `/collections/cart/${customerId}`
            );
            return response;
        } catch (error) {
            console.error('[CollectionService] Error fetching collection cart:', error);
            throw error;
        }
    }

    /**
     * Remove collection from cart
     */
    async removeFromCart(collectionCartId: number, customerId: number): Promise<ApiResponse<any>> {
        try {
            const response = await apiRequest<ApiResponse<any>>(
                `/collections/cart/${collectionCartId}`,
                {
                    method: 'DELETE',
                    body: JSON.stringify({
                        customer_id: customerId,
                    }),
                }
            );
            return response;
        } catch (error) {
            console.error('[CollectionService] Error removing collection from cart:', error);
            throw error;
        }
    }

    /**
     * Calculate collection price
     */
    async calculatePrice(items: CollectionCartItem[]): Promise<ApiResponse<{ total_price: number }>> {
        try {
            const response = await apiRequest<ApiResponse<{ total_price: number }>>(
                `/collections/calculate-price`,
                {
                    method: 'POST',
                    body: JSON.stringify({ items }),
                }
            );
            return response;
        } catch (error) {
            console.error('[CollectionService] Error calculating price:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const collectionService = new CollectionService();
