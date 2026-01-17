import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { wishlistService, type WishlistItem } from '../services/wishlist.service';
import { useAuth } from './AuthContext';
import { AuthenticationError } from '../services/api.config';

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  wishlistCount: number;
  isInWishlist: (productId: number) => boolean;
  addToWishlist: (productId: number) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  refreshWishlist: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_CACHE_KEY = 'wishlist_cache';
const WISHLIST_COUNT_CACHE_KEY = 'wishlist_count_cache';
const CACHE_TIMESTAMP_KEY = 'wishlist_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface WishlistProviderProps {
  children: ReactNode;
}

export const WishlistProvider: React.FC<WishlistProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from cache
  const loadFromCache = useCallback(() => {
    try {
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        if (now - timestamp < CACHE_DURATION) {
          const cachedItems = localStorage.getItem(WISHLIST_CACHE_KEY);
          const cachedCount = localStorage.getItem(WISHLIST_COUNT_CACHE_KEY);
          
          if (cachedItems) {
            const items = JSON.parse(cachedItems);
            setWishlistItems(items);
          }
          
          if (cachedCount) {
            setWishlistCount(parseInt(cachedCount, 10));
          }
          
          return true; // Cache is valid
        }
      }
    } catch (error) {
      console.error('[WishlistContext] Error loading from cache:', error);
    }
    return false;
  }, []);

  // Save to cache
  const saveToCache = useCallback((items: WishlistItem[], count: number) => {
    try {
      localStorage.setItem(WISHLIST_CACHE_KEY, JSON.stringify(items));
      localStorage.setItem(WISHLIST_COUNT_CACHE_KEY, count.toString());
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('[WishlistContext] Error saving to cache:', error);
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(WISHLIST_CACHE_KEY);
      localStorage.removeItem(WISHLIST_COUNT_CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (error) {
      console.error('[WishlistContext] Error clearing cache:', error);
    }
  }, []);

  // Refresh wishlist from server
  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      setWishlistCount(0);
      clearCache();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [wishlistResponse, countResponse] = await Promise.all([
        wishlistService.getWishlist(),
        wishlistService.getWishlistCount(),
      ]);

      const rawItems = wishlistResponse.data || [];
      // Convert wishlistId to string (backend sends it as number from BigInt)
      const items = rawItems.map(item => ({
        ...item,
        wishlistId: String(item.wishlistId),
        createdAt: item.createdAt || new Date().toISOString(),
      }));
      const count = countResponse.data.count || 0;

      setWishlistItems(items);
      setWishlistCount(count);
      saveToCache(items, count);
    } catch (err: any) {
      console.error('[WishlistContext] Error refreshing wishlist:', err);
      
      // If error is not auth error, try to use cache
      if (!(err instanceof AuthenticationError || err.name === 'AuthenticationError')) {
        const cacheValid = loadFromCache();
        if (!cacheValid) {
          setError(err.message || 'Failed to load wishlist');
        }
      } else {
        setWishlistItems([]);
        setWishlistCount(0);
        clearCache();
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, saveToCache, clearCache, loadFromCache]);

  // Load wishlist on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      // Try cache first for instant UI
      const cacheValid = loadFromCache();
      
      // Always refresh from server, but cache provides instant feedback
      refreshWishlist();
    } else {
      setWishlistItems([]);
      setWishlistCount(0);
      clearCache();
    }
  }, [isAuthenticated, refreshWishlist, loadFromCache, clearCache]);

  // Check if product is in wishlist
  const isInWishlist = useCallback((productId: number): boolean => {
    return wishlistItems.some(item => item.productId === productId);
  }, [wishlistItems]);

  // Add to wishlist
  const addToWishlist = useCallback(async (productId: number) => {
    try {
      setError(null);
      
      await wishlistService.addToWishlist(productId);
      
      // Optimistically update UI
      const currentCount = wishlistCount;
      setWishlistCount(currentCount + 1);
      
      // Refresh from server to get full item details
      await refreshWishlist();
    } catch (err: any) {
      console.error('[WishlistContext] Error adding to wishlist:', err);
      
      // Revert optimistic update
      await refreshWishlist();
      
      throw err;
    }
  }, [wishlistCount, refreshWishlist]);

  // Remove from wishlist
  const removeFromWishlist = useCallback(async (productId: number) => {
    try {
      setError(null);
      
      // Optimistically update UI
      const currentItems = wishlistItems.filter(item => item.productId !== productId);
      const currentCount = Math.max(0, wishlistCount - 1);
      
      setWishlistItems(currentItems);
      setWishlistCount(currentCount);
      saveToCache(currentItems, currentCount);
      
      await wishlistService.removeFromWishlist(productId);
      
      // Refresh from server to ensure sync
      await refreshWishlist();
    } catch (err: any) {
      console.error('[WishlistContext] Error removing from wishlist:', err);
      
      // Revert optimistic update
      await refreshWishlist();
      
      throw err;
    }
  }, [wishlistItems, wishlistCount, refreshWishlist, saveToCache]);

  const value: WishlistContextType = {
    wishlistItems,
    wishlistCount,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    refreshWishlist,
    isLoading,
    error,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
