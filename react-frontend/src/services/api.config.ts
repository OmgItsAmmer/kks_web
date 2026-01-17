// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_VERSION = 'v1';

export const API_ENDPOINTS = {
    BASE_URL: `${API_BASE_URL}/api/${API_VERSION}`,

    // Health check
    HEALTH_CHECK: '/health',

    // Category endpoints
    CATEGORIES: '/categories',
    FEATURED_CATEGORIES: '/categories/featured',
    CATEGORY_BY_ID: (id: number) => `/categories/${id}`,

    // Product endpoints
    PRODUCTS: '/products',
    POPULAR_PRODUCTS: '/products/popular',
    PRODUCT_BY_ID: (id: number) => `/products/${id}`,
    PRODUCTS_BY_CATEGORY: (categoryId: number) => `/products/category/${categoryId}`,
    PRODUCTS_BY_BRAND: (brandId: number) => `/products/brand/${brandId}`,
    PRODUCT_VARIANTS: (id: number) => `/products/${id}/variants`,
    PRODUCT_REVIEWS: (id: number) => `/products/${id}/reviews`,
    PRODUCT_IMAGES: (id: number) => `/products/${id}/images`,
    PRODUCT_RELATED: (id: number) => `/products/${id}/related`,
    SEARCH_SUGGESTIONS: '/products/search/suggestions',

    // Review endpoints
    REVIEWS: '/reviews',
    REVIEW_BY_ID: (id: number) => `/reviews/${id}`,
};

/**
 * Custom error class for authentication errors
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  retryAfter: number;
  
  constructor(message: string, retryAfter: number = 60) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter; // seconds
  }
}

/**
 * Sleep utility for retries
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make an API request with automatic token handling and retry logic for rate limits
 */
export async function apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {},
    retryConfig?: { maxRetries?: number; retryDelay?: number }
): Promise<T> {
    const maxRetries = retryConfig?.maxRetries ?? 3;
    const retryDelay = retryConfig?.retryDelay ?? 1000;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            // Wait before retrying (exponential backoff)
            const delay = retryDelay * Math.pow(2, attempt - 1);
            await sleep(delay);
        }
        
        const token = localStorage.getItem('auth_token');
        
        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string> || {}),
        };

        // Only set Content-Type for requests with body
        if (options.body && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = endpoint.startsWith('http') 
            ? endpoint 
            : `${API_ENDPOINTS.BASE_URL}${endpoint}`;

        // Ensure body is a string if it's an object
        let body = options.body;
        if (body && typeof body === 'object' && !(body instanceof FormData)) {
            body = JSON.stringify(body);
        }

        const response = await fetch(url, {
            ...options,
            method: options.method || 'GET',
            headers,
            body: body as BodyInit | null,
        });

        // Handle 204 No Content - no body to parse, return immediately
        if (response.status === 204) {
            return null as T;
        }

        if (!response.ok) {
            // Handle 401 Unauthorized specifically
            if (response.status === 401) {
                // Clear invalid/expired token
                localStorage.removeItem('auth_token');
                const error = await response.json().catch(() => ({ message: 'Authentication required. Please login again.' }));
                throw new AuthenticationError(error.message || 'Authentication required. Please login again.');
            }
            
            // Handle 429 Rate Limit with retry logic
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
                
                // If we have retries left, wait and retry
                if (attempt < maxRetries) {
                    const waitTime = retryAfter * 1000; // Convert to milliseconds
                    console.warn(`[apiRequest] Rate limited. Retrying after ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
                    await sleep(waitTime);
                    continue; // Retry the request
                }
                
                // No retries left, throw error
                const error = await response.json().catch(() => ({ message: 'Too many requests. Please try again later.' }));
                const rateLimitError = new RateLimitError(
                    error.message || error.error || 'Too many requests. Please try again later.',
                    retryAfter
                );
                (rateLimitError as any).status = 429;
                (rateLimitError as any).statusCode = 429;
                throw rateLimitError;
            }
            
            // Handle 404 Not Found
            if (response.status === 404) {
                const error = await response.json().catch(() => ({ message: 'Resource not found', error: 'Resource not found' }));
                const notFoundError = new Error(error.message || error.error || 'Resource not found');
                (notFoundError as any).status = 404;
                (notFoundError as any).statusCode = 404;
                throw notFoundError;
            }
            
            // Handle 422 Validation Error
            if (response.status === 422) {
                const error = await response.json().catch(() => ({ 
                    message: 'Validation failed', 
                    error: 'Validation failed',
                    errors: {}
                }));
                const validationError = new Error(error.message || error.error || 'Validation failed');
                (validationError as any).status = 422;
                (validationError as any).statusCode = 422;
                (validationError as any).errors = error.errors || {}; // Include validation errors
                (validationError as any).response = error; // Include full response
                throw validationError;
            }
            
            // Handle other errors
            const error = await response.json().catch(() => ({ message: 'Request failed', error: 'Request failed' }));
            const apiError = new Error(error.message || error.error || `HTTP ${response.status}`);
            (apiError as any).status = response.status;
            (apiError as any).statusCode = response.status;
            (apiError as any).response = error; // Include full error response
            (apiError as any).errors = error.errors; // Include validation errors if present
            throw apiError;
        }

        // For successful responses, check if there's a body
        const contentType = response.headers.get('content-type');
        
        // If no content-type or not JSON, try to get text
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            return (text || null) as T;
        }

        // Parse JSON response
        try {
            const text = await response.text();
            if (!text || text.trim() === '') {
                return null as T;
            }
            return JSON.parse(text) as T;
        } catch (parseError) {
            // If JSON parsing fails, return null instead of throwing
            console.warn('Failed to parse JSON response, returning null:', parseError);
            return null as T;
        }
    }
    
    // This should never be reached, but TypeScript needs it
    throw new Error('Request failed after all retries');
}

export default API_ENDPOINTS;
