import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionService, type CollectionCartItem } from '../services/collection.service';

/**
 * React Query hook for fetching featured collections (for hero section)
 * Cache duration: 5 minutes (staleTime)
 */
export function useFeaturedCollections(limit = 7) {
  return useQuery({
    queryKey: ['featuredCollections', limit],
    queryFn: async () => {
      const response = await collectionService.getFeaturedCollections(limit);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * React Query hook for fetching ONE premium collection (for main banner)
 * Cache duration: 5 minutes (staleTime)
 */
export function usePremiumCollection() {
  return useQuery({
    queryKey: ['premiumCollection'],
    queryFn: async () => {
      const response = await collectionService.getPremiumCollection();
      if (response.success) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * React Query hook for fetching standard collections (non-premium, for side/bottom cards)
 * Cache duration: 5 minutes (staleTime)
 */
export function useStandardCollections(limit = 6) {
  return useQuery({
    queryKey: ['standardCollections', limit],
    queryFn: async () => {
      const response = await collectionService.getStandardCollections(limit);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * React Query hook for fetching all collections with pagination
 */
export function useCollections(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['collections', page, pageSize],
    queryFn: async () => {
      const response = await collectionService.getCollections(page, pageSize);
      if (response.success && response.data) {
        return {
          collections: response.data,
          pagination: response.pagination,
        };
      }
      return { collections: [], pagination: null };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * React Query hook for fetching collection by ID with full details
 * Cache duration: 10 minutes
 */
export function useCollectionDetails(collectionId: number | null) {
  return useQuery({
    queryKey: ['collectionDetails', collectionId],
    queryFn: async () => {
      if (!collectionId) throw new Error('Collection ID is required');
      const response = await collectionService.getCollectionById(collectionId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error('Failed to fetch collection details');
    },
    enabled: collectionId !== null && collectionId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * React Query hook for fetching customer's collection cart
 */
export function useCollectionCart(customerId: number | null) {
  return useQuery({
    queryKey: ['collectionCart', customerId],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required');
      const response = await collectionService.getCustomerCollectionCart(customerId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: customerId !== null && customerId > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}

/**
 * Mutation hook for adding collection to cart
 */
export function useAddCollectionToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      customerId,
      items,
    }: {
      collectionId: number;
      customerId: number;
      items: CollectionCartItem[];
    }) => {
      const response = await collectionService.addToCart(collectionId, customerId, items);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate collection cart cache
      queryClient.invalidateQueries({ queryKey: ['collectionCart', variables.customerId] });
      // Also invalidate regular cart cache if needed
      queryClient.invalidateQueries({ queryKey: ['cart', variables.customerId] });
    },
  });
}

/**
 * Mutation hook for removing collection from cart
 */
export function useRemoveCollectionFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionCartId,
      customerId,
    }: {
      collectionCartId: number;
      customerId: number;
    }) => {
      const response = await collectionService.removeFromCart(collectionCartId, customerId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate collection cart cache
      queryClient.invalidateQueries({ queryKey: ['collectionCart', variables.customerId] });
    },
  });
}

/**
 * Mutation hook for calculating collection price
 */
export function useCalculateCollectionPrice() {
  return useMutation({
    mutationFn: async (items: CollectionCartItem[]) => {
      const response = await collectionService.calculatePrice(items);
      return response.data;
    },
  });
}
