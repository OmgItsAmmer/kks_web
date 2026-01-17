import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { productService, type BackendProduct, type BackendProductWithDetails, type BackendProductVariant } from '../services/product.service';
import { reviewService, type BackendReview } from '../services/review.service';
import { transformBackendProduct } from '../types/product';
import { RateLimitError } from '../services/api.config';
import type { Product } from '../types';

/**
 * React Query hook for fetching popular products with caching
 * Cache duration: 5 minutes (staleTime)
 * Cache persists: Until component unmounts or cache is invalidated
 */
export function usePopularProducts(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['popularProducts', page, pageSize],
    queryFn: async () => {
      const response = await productService.getPopularProducts(page, pageSize);
      if (response.success && response.data) {
        return {
          products: response.data.map(transformBackendProduct),
          pagination: response.pagination,
        };
      }
      return { products: [], pagination: null };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for 10 minutes after last use
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Use cached data if available when component mounts
    retry: 2, // Retry failed requests 2 times
  });
}

/**
 * React Query hook for fetching products by category with caching
 */
export function useProductsByCategory(
  categoryId: number | 'all',
  page = 1,
  pageSize = 20
) {
  return useQuery({
    queryKey: ['productsByCategory', categoryId, page, pageSize],
    queryFn: async () => {
      let response;
      if (categoryId === 'all') {
        response = await productService.getPopularProducts(page, pageSize);
      } else {
        response = await productService.getProductsByCategory(categoryId, page, pageSize);
      }
      
      if (response.success && response.data) {
        return {
          products: response.data.map(transformBackendProduct),
          pagination: response.pagination,
        };
      }
      return { products: [], pagination: null };
    },
    enabled: categoryId !== null && categoryId !== undefined, // Only fetch if categoryId is valid
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * Infinite query hook for loading more products (pagination)
 */
export function useInfiniteProductsByCategory(
  categoryId: number | 'all',
  pageSize = 12
) {
  return useInfiniteQuery({
    queryKey: ['productsByCategory', 'infinite', categoryId, pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      let response;
      if (categoryId === 'all') {
        response = await productService.getPopularProducts(pageParam, pageSize);
      } else {
        response = await productService.getProductsByCategory(categoryId, pageParam, pageSize);
      }
      
      if (response.success && response.data) {
        return {
          products: response.data.map(transformBackendProduct),
          pagination: response.pagination,
          nextPage: response.pagination && pageParam < response.pagination.totalPages 
            ? pageParam + 1 
            : undefined,
        };
      }
      return { products: [], pagination: null, nextPage: undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled: categoryId !== null && categoryId !== undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * React Query hook for fetching product details by ID with caching
 * Cache duration: 10 minutes (product details change less frequently)
 */
export function useProductDetails(productId: number | null) {
  return useQuery({
    queryKey: ['productDetails', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await productService.getProductById(productId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error('Failed to fetch product details');
    },
    enabled: productId !== null && productId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - product details change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * React Query hook for fetching product images with caching
 */
export function useProductImages(productId: number | null) {
  return useQuery({
    queryKey: ['productImages', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await productService.getProductImages(productId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: productId !== null && productId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * React Query hook for fetching product variants with caching
 */
export function useProductVariants(productId: number | null) {
  return useQuery({
    queryKey: ['productVariants', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await productService.getProductVariants(productId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: productId !== null && productId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      // Don't retry rate limit errors - apiRequest already handled retries
      if (error instanceof RateLimitError || (error as any)?.name === 'RateLimitError') {
        return false;
      }
      // Retry other errors up to 2 times with exponential backoff
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
  });
}

/**
 * React Query hook for fetching product reviews with caching
 */
export function useProductReviews(productId: number | null) {
  return useQuery({
    queryKey: ['productReviews', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await reviewService.getProductReviews(productId);
      if (response.success && response.data) {
        return response.data;
      }
      return { reviews: [], averageRating: 0, totalReviews: 0 };
    },
    enabled: productId !== null && productId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - reviews may update more frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * React Query hook for fetching related products with caching
 */
export function useRelatedProducts(productId: number | null) {
  return useQuery({
    queryKey: ['relatedProducts', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await productService.getRelatedProducts(productId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: productId !== null && productId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}
