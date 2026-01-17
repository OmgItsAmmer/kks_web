import API_ENDPOINTS from './api.config';

export interface Category {
    category_id: number;
    category_name: string;
    description: string | null;
    imageUrl: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
}

class CategoryService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_ENDPOINTS.BASE_URL;
    }

    /**
     * Fetch all categories
     */
    async getAllCategories(): Promise<ApiResponse<Category[]>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.CATEGORIES}`;
        
        console.log('[CategoryService] Fetching all categories from:', url);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[CategoryService] Failed to fetch categories:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                });
                throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[CategoryService] ✅ Categories fetched successfully:', data.data?.length || 0, 'categories');
            return data;
        } catch (error: any) {
            console.error('[CategoryService] ❌ Error fetching categories:', error);
            throw error;
        }
    }

    /**
     * Fetch featured categories
     */
    async getFeaturedCategories(): Promise<ApiResponse<Category[]>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.FEATURED_CATEGORIES}`;
        
        console.log('[CategoryService] Fetching featured categories from:', url);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[CategoryService] Failed to fetch featured categories:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                });
                throw new Error(`Failed to fetch featured categories: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[CategoryService] ✅ Featured categories fetched successfully:', data.data?.length || 0, 'categories');
            return data;
        } catch (error: any) {
            console.error('[CategoryService] ❌ Error fetching featured categories:', error);
            throw error;
        }
    }

    /**
     * Fetch category by ID
     */
    async getCategoryById(id: number): Promise<ApiResponse<Category>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.CATEGORY_BY_ID(id)}`;
        
        console.log('[CategoryService] Fetching category by ID:', id);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[CategoryService] Failed to fetch category:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                });
                throw new Error(`Failed to fetch category: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[CategoryService] ✅ Category fetched successfully');
            return data;
        } catch (error: any) {
            console.error('[CategoryService] ❌ Error fetching category:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const categoryService = new CategoryService();
