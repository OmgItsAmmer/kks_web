import { useQuery } from '@tanstack/react-query';
import { categoryService, type Category } from '../services/category.service';

/**
 * React Query hook for fetching all categories with caching
 * Cache duration: 10 minutes (categories change less frequently)
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoryService.getAllCategories();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
}
