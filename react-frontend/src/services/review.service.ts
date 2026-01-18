import API_ENDPOINTS, { apiRequest } from './api.config';

// Backend types matching the Prisma schema
export interface BackendReview {
    review_id: number;
    product_id: number;
    customer_id: number;
    rating: number;
    review: string;
    sent_at: Date;
    customerName?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

class ReviewService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_ENDPOINTS.BASE_URL;
        console.log('[ReviewService] Service initialized');
        console.log('[ReviewService] Base URL:', this.baseUrl);
    }

    /**
     * Fetch reviews by product ID
     */
    async getProductReviews(productId: number): Promise<ApiResponse<{
        reviews: BackendReview[];
        averageRating: number;
        totalReviews: number;
    }>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.PRODUCT_REVIEWS(productId)}`;
        
        console.log('[ReviewService] Fetching reviews for product:', productId);
        console.log('[ReviewService] URL:', url);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('[ReviewService] Response:', {
                status: response.status,
                ok: response.ok,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ReviewService] Error:', errorText);
                throw new Error(`Failed to fetch reviews: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[ReviewService] ✅ Reviews fetched:', data.data?.reviews?.length || 0, 'reviews');
            return data;
        } catch (error: any) {
            console.error('[ReviewService] ❌ Error:', error);
            throw error;
        }
    }

    /**
     * Fetch reviews with rating filter
     */
    async getReviewsByRating(minRating: number, limit = 10): Promise<ApiResponse<BackendReview[]>> {
        const url = `${this.baseUrl}/reviews/filter?minRating=${minRating}&limit=${limit}`;
        
        console.log('[ReviewService] Fetching reviews with rating >=', minRating);
        console.log('[ReviewService] URL:', url);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ReviewService] Error:', errorText);
                throw new Error(`Failed to fetch reviews: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[ReviewService] ✅ Reviews fetched:', data.data?.length || 0, 'reviews');
            return data;
        } catch (error: any) {
            console.error('[ReviewService] ❌ Error:', error);
            throw error;
        }
    }

    /**
     * Get happy customers count (rating > 4)
     */
    async getHappyCustomersStats(): Promise<ApiResponse<{
        count: number;
        averageRating: number;
    }>> {
        const url = `${this.baseUrl}/reviews/stats/happy`;
        
        console.log('[ReviewService] Fetching happy customers stats');
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ReviewService] Error:', errorText);
                throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[ReviewService] ✅ Stats fetched');
            return data;
        } catch (error: any) {
            console.error('[ReviewService] ❌ Error:', error);
            throw error;
        }
    }

    /**
     * Submit a new review (requires authentication)
     */
    async submitReview(productId: number, rating: number, review: string): Promise<ApiResponse<BackendReview>> {
        console.log('[ReviewService] Submitting review for product:', productId);
        
        try {
            const data = await apiRequest<ApiResponse<BackendReview>>(API_ENDPOINTS.REVIEWS, {
                method: 'POST',
                body: JSON.stringify({
                    productId,
                    rating,
                    review,
                }),
            });
            
            console.log('[ReviewService] ✅ Review submitted successfully');
            return data;
        } catch (error: any) {
            console.error('[ReviewService] ❌ Error:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const reviewService = new ReviewService();
