import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { LoaderProvider } from './contexts/LoaderContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProductDetail from './pages/product_details/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Wishlist from './pages/Wishlist';
import SearchResults from './pages/SearchResults';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Addresses from './pages/Addresses';

// Google Client ID from environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Configure React Query with optimal cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time: 5 minutes (data is considered fresh for 5 minutes)
      staleTime: 5 * 60 * 1000,
      // Default cache time: 10 minutes (data stays in cache for 10 minutes after last use)
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus (better UX, uses cache)
      refetchOnWindowFocus: false,
      // Don't refetch on mount if data exists in cache
      refetchOnMount: false,
      // Retry failed requests 2 times
      retry: 2,
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <WishlistProvider>
            <SnackbarProvider>
              <LoaderProvider>
                <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/products/:category/:productId" element={<ProductDetail />} />
                <Route path="/search" element={<SearchResults />} />
                <Route 
                  path="/cart" 
                  element={
                    <ProtectedRoute>
                      <Cart />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/checkout" 
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/wishlist" 
                  element={
                    <ProtectedRoute>
                      <Wishlist />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/orders" 
                  element={
                    <ProtectedRoute>
                      <Orders />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/orders/:orderId" 
                  element={
                    <ProtectedRoute>
                      <OrderDetail />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/addresses" 
                  element={
                    <ProtectedRoute>
                      <Addresses />
                    </ProtectedRoute>
                  } 
                />
                {/* Add more routes as needed */}
                <Route path="*" element={<Home />} />
              </Route>
            </Routes>
          </Router>
              </LoaderProvider>
          </SnackbarProvider>
        </WishlistProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
