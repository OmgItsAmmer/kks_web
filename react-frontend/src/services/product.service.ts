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
    }

    /**
     * Fetch all products with optional filters
     */
    async getProducts(params?: SearchParams): Promise<PaginatedResponse<BackendProduct>> {
        const queryParams = new URLSearchParams();

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value.toString());
                }
            });
        }

        const url = `${this.baseUrl}${API_ENDPOINTS.PRODUCTS}?${queryParams.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch products: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch popular products
     */
    async getPopularProducts(page = 1, pageSize = 10): Promise<PaginatedResponse<BackendProduct>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.POPULAR_PRODUCTS}?page=${page}&pageSize=${pageSize}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch popular products: ${response.statusText}`);
        }

        return response.json();
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
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch product: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetch product variants
     */
    async getProductVariants(id: number): Promise<ApiResponse<BackendProductVariant[]>> {
        const url = `${this.baseUrl}${API_ENDPOINTS.PRODUCT_VARIANTS(id)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch product variants: ${response.statusText}`);
        }

        return response.json();
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
}

// Export singleton instance
export const productService = new ProductService();
