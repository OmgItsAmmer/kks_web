// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_VERSION = 'v1';

export const API_ENDPOINTS = {
    BASE_URL: `${API_BASE_URL}/api/${API_VERSION}`,

    // Product endpoints
    PRODUCTS: '/products',
    POPULAR_PRODUCTS: '/products/popular',
    PRODUCT_BY_ID: (id: number) => `/products/${id}`,
    PRODUCTS_BY_CATEGORY: (categoryId: number) => `/products/category/${categoryId}`,
    PRODUCTS_BY_BRAND: (brandId: number) => `/products/brand/${brandId}`,
    PRODUCT_VARIANTS: (id: number) => `/products/${id}/variants`,
    PRODUCT_REVIEWS: (id: number) => `/products/${id}/reviews`,
    PRODUCT_IMAGES: (id: number) => `/products/${id}/images`,
    SEARCH_SUGGESTIONS: '/products/search/suggestions',
};

export default API_ENDPOINTS;
