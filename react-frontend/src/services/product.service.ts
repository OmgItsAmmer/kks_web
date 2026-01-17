import API_ENDPOINTS from './api.config';

// Backend types matching the Prisma schema
export interface BackendProduct {
    product_id: number;
    name: string;
    description: string;
    base_price: string;
    sale_price: string;
    category_id: number | null;
    brandID: number | null;
    ispopular: boolean;
    stock_quantity: number;
    alert_stock: number | null;
    isVisible: boolean;
    tag: string | null;
    price_range: string;
    created_at: Date;
    updated_at: Date;
    mainImage?: string | null;
}

export interface BackendProductWithDetails extends BackendProduct {
    category?: {
        category_id: number;
        category_name: string;
    };
    brand?: {
        brandID: number;
        brand_name: string;
    };
    variants?: BackendProductVariant[];
    images?: string[];
    rating?: number;
    reviewCount?: number;
}

export interface BackendProductVariant {
    variant_id: number;
    product_id: number;
    variant_name: string;
    buy_price: number;
    sell_price: number;
    stock: number;
    sku: string | null;
    is_visible: boolean;
    alert_stock: number;
    created_at: Date;
    updated_at: Date;
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

export interface SearchParams {
    q?: string;
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

class ProductService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_ENDPOINTS.BASE_URL;
        console.log('========================================');
        console.log('[ProductService] Service initialized');
        console.log('[ProductService] Base URL:', this.baseUrl);
        console.log('========================================');
    }

    /**
     * Fetch all products with optional filters
     */
    async getProducts(params?: SearchParams): Promise<PaginatedResponse<BackendProduct>> {
        const queryParams = new URLSearchParams();

        if (params) {
            // Map frontend camelCase to backend camelCase (backend expects camelCase)
            if (params.q !== undefined && params.q !== null) {
                queryParams.append('q', params.q);
            }
            if (params.categoryId !== undefined && params.categoryId !== null) {
                queryParams.append('categoryId', params.categoryId.toString());
            }
            if (params.brandId !== undefined && params.brandId !== null) {
                queryParams.append('brandId', params.brandId.toString());
            }
            if (params.minPrice !== undefined && params.minPrice !== null) {
                queryParams.append('minPrice', params.minPrice.toString());
            }
            if (params.maxPrice !== undefined && params.maxPrice !== null) {
                queryParams.append('maxPrice', params.maxPrice.toString());
            }
            if (params.isPopular !== undefined && params.isPopular !== null) {
                queryParams.append('isPopular', params.isPopular.toString());
            }
            if (params.tag !== undefined && params.tag !== null) {
                queryParams.append('tag', params.tag);
            }
            if (params.sortBy !== undefined && params.sortBy !== null) {
                queryParams.append('sortBy', params.sortBy);
            }
            if (params.sortOrder !== undefined && params.sortOrder !== null) {
                queryParams.append('sortOrder', params.sortOrder);
            }
            if (params.page !== undefined && params.page !== null) {
                queryParams.append('page', params.page.toString());
            }
            if (params.pageSize !== undefined && params.pageSize !== null) {
                queryParams.append('pageSize', params.pageSize.toString());
            }
        }

        const url = `${this.baseUrl}${API_ENDPOINTS.PRODUCTS}?${queryParams.toString()}`;
        
        console.log('========================================');
        console.log('[ProductService] Fetching products with filters');
        console.log('[ProductService] Base URL:', this.baseUrl);
        console.log('[ProductService] Full URL:', url);
        console.log('[ProductService] Parameters:', params);
        console.log('========================================');
        
        try {
            console.log('[ProductService] Making fetch request...');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('[ProductService] Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('========================================');
                console.error('[ProductService] ERROR - Response not OK');
                console.error('[ProductService] Status:', response.status);
                console.error('[ProductService] Status Text:', response.statusText);
                console.error('[ProductService] Error Body:', errorText);
                console.error('========================================');
                throw new Error(`Failed to fetch products: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log('[ProductService] ✅ Success - Products fetched:', data.data?.length || 0, 'products');
            return data;
        } catch (error: any) {
            console.error('========================================');
            console.error('[ProductService] ❌ FETCH ERROR');
            console.error('[ProductService] Error type:', error?.constructor?.name);
            console.error('[ProductService] Error message:', error?.message);
            console.error('[ProductService] Error stack:', error?.stack);
            console.error('[ProductService] Full error object:', error);
            
            // Check for specific error types
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('[ProductService] 🔴 NETWORK ERROR - Request failed to reach server');
                console.error('[ProductService] Possible causes:');
                console.error('  1. Backend server is not running');
                console.error('  2. CORS issue');
                console.error('  3. Wrong URL/port');
                console.error('  4. Network connectivity issue');
            } else if (error.name === 'NetworkError' || error.message.includes('Failed to fetch')) {
                console.error('[ProductService] 🔴 NETWORK ERROR - Cannot connect to backend');
            }
            console.error('========================================');
            throw error;
        }
    }

    /**
     * Fetch popular products
     */
    async getPopularProducts(page = 1, pageSize = 10): Promise<PaginatedResponse<BackendProduct>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.POPULAR_PRODUCTS}?page=${page}&pageSize=${pageSize}`;
        
        console.log('========================================');
        console.log('[ProductService] Fetching popular products');
        console.log('[ProductService] Base URL:', this.baseUrl);
        console.log('[ProductService] Full URL:', url);
        console.log('[ProductService] Endpoint:', API_ENDPOINTS.POPULAR_PRODUCTS);
        console.log('[ProductService] Parameters: page=', page, 'pageSize=', pageSize);
        console.log('========================================');
        
        try {
            console.log('[ProductService] Making fetch request...');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('[ProductService] Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(Array.from(response.headers.entries())),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('========================================');
                console.error('[ProductService] ERROR - Response not OK');
                console.error('[ProductService] Status:', response.status);
                console.error('[ProductService] Status Text:', response.statusText);
                console.error('[ProductService] Error Body:', errorText);
                console.error('========================================');
                throw new Error(`Failed to fetch popular products: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log('[ProductService] ✅ Success - Products fetched:', data.data?.length || 0, 'products');
            console.log('[ProductService] Response data:', data);
            return data;
        } catch (error: any) {
            console.error('========================================');
            console.error('[ProductService] ❌ FETCH ERROR');
            console.error('[ProductService] Error type:', error?.constructor?.name);
            console.error('[ProductService] Error message:', error?.message);
            console.error('[ProductService] Error stack:', error?.stack);
            console.error('[ProductService] Full error object:', error);
            
            // Check for specific error types
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('[ProductService] 🔴 NETWORK ERROR - Request failed to reach server');
                console.error('[ProductService] Possible causes:');
                console.error('  1. Backend server is not running');
                console.error('  2. CORS issue');
                console.error('  3. Wrong URL/port');
                console.error('  4. Network connectivity issue');
            } else if (error.name === 'NetworkError' || error.message.includes('Failed to fetch')) {
                console.error('[ProductService] 🔴 NETWORK ERROR - Cannot connect to backend');
            }
            console.error('========================================');
            throw error;
        }
    }

    /**
     * Fetch products by category
     */
    async getProductsByCategory(
        categoryId: number,
        page = 1,
        pageSize = 20
    ): Promise<PaginatedResponse<BackendProduct>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.PRODUCTS_BY_CATEGORY(categoryId)}?page=${page}&pageSize=${pageSize}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch products by category: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch products by brand
     */
    async getProductsByBrand(brandId: number, limit = 50): Promise<ApiResponse<BackendProduct[]>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.PRODUCTS_BY_BRAND(brandId)}?limit=${limit}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch products by brand: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch product by ID with full details
     */
    async getProductById(id: number): Promise<ApiResponse<BackendProductWithDetails>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.PRODUCT_BY_ID(id)}`;
        
        console.log('[ProductService] Fetching product by ID:', id);
        console.log('[ProductService] URL:', url);
        
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch product: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch product images
     */
    async getProductImages(id: number): Promise<ApiResponse<string[]>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.PRODUCT_IMAGES(id)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch product images: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch related products (same category, limit 6)
     */
    async getRelatedProducts(id: number): Promise<ApiResponse<BackendProduct[]>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.PRODUCT_RELATED(id)}`;
        
        console.log('[ProductService] Fetching related products for:', id);
        
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch related products: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch product variants
     */
    async getProductVariants(id: number): Promise<ApiResponse<BackendProductVariant[]>> {
        const { apiRequest } = await import('./api.config');
        try {
            const response = await apiRequest<ApiResponse<BackendProductVariant[]>>(
                API_ENDPOINTS.PRODUCT_VARIANTS(id),
                {
                    method: 'GET',
                },
                {
                    maxRetries: 3,
                    retryDelay: 1000, // Start with 1 second delay
                }
            );
            return response;
        } catch (error: any) {
            console.error('[ProductService] Error fetching product variants:', error);
            throw error;
        }
    }

    /**
     * Fetch search suggestions
     */
    async getSearchSuggestions(query: string): Promise<ApiResponse<string[]>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.SEARCH_SUGGESTIONS}?q=${encodeURIComponent(query)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch search suggestions: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Health check - Check if backend server is reachable
     */
    async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
        // Use root endpoint (/) for health check
        // In dev: Use direct connection to localhost:3000 (bypasses Vite proxy since / is not proxied)
        // In prod: Use API_BASE_URL if set, otherwise use direct connection
        const apiBase = import.meta.env.VITE_API_BASE_URL;
        const isDev = import.meta.env.MODE === 'development';
        const healthUrl = apiBase 
            ? `${apiBase}${API_ENDPOINTS.HEALTH_CHECK}` 
            : isDev 
                ? 'http://localhost:3000/' // Direct connection in dev (backend has CORS enabled)
                : API_ENDPOINTS.HEALTH_CHECK;
        
        console.log('========================================');
        console.log('[ProductService] 🏥 Starting Health Check...');
        console.log('[ProductService] Health check URL:', healthUrl);
        console.log('[ProductService] Timestamp:', new Date().toISOString());
        console.log('========================================');

        try {
            const startTime = performance.now();
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'text/plain',
                },
            });

            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            const responseText = await response.text();

            const healthResult = {
                status: response.ok ? '✅ HEALTHY' : '❌ UNHEALTHY',
                message: responseText,
                timestamp: new Date().toISOString(),
                statusCode: response.status,
                statusText: response.statusText,
                responseTime: `${responseTime}ms`,
                headers: Object.fromEntries(Array.from(response.headers.entries())),
            };

            console.log('========================================');
            console.log('[ProductService] 🏥 Health Check Result:');
            console.log('[ProductService] Status:', healthResult.status);
            console.log('[ProductService] Status Code:', healthResult.statusCode);
            console.log('[ProductService] Status Text:', healthResult.statusText);
            console.log('[ProductService] Response Time:', healthResult.responseTime);
            console.log('[ProductService] Message:', healthResult.message);
            console.log('[ProductService] Timestamp:', healthResult.timestamp);
            console.log('[ProductService] Response Headers:', healthResult.headers);
            console.log('[ProductService] Full Response:');
            console.log(JSON.stringify(healthResult, null, 2));
            console.log('========================================');

            if (!response.ok) {
                throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
            }

            return healthResult;
        } catch (error: any) {
            const errorResult = {
                status: '❌ ERROR',
                message: error.message || 'Failed to connect to backend',
                timestamp: new Date().toISOString(),
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
            };

            console.error('========================================');
            console.error('[ProductService] 🏥 Health Check FAILED:');
            console.error('[ProductService] Error Status:', errorResult.status);
            console.error('[ProductService] Error Message:', errorResult.message);
            console.error('[ProductService] Error Details:', errorResult.error);
            console.error('[ProductService] Timestamp:', errorResult.timestamp);
            console.error('[ProductService] Full Error Response:');
            console.error(JSON.stringify(errorResult, null, 2));
            console.error('[ProductService] 💡 Troubleshooting:');
            console.error('  1. Check if backend is running: cd kks_online_backend && cargo run');
            console.error('  2. Verify backend is on port 3000');
            console.error('  3. Check Vite proxy configuration');
            console.error('  4. Disable VPN if connected (Warp VPN can block localhost)');
            console.error('========================================');

            throw error;
        }
    }
}

// Export singleton instance
export const productService = new ProductService();
