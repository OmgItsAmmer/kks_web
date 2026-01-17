import type { BackendProduct, BackendProductWithDetails } from '../services/product.service';

export interface ProductFeature {
  label: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  priceRange?: string;
  rating: number;
  reviewCount: string;
  image: string;
  features: ProductFeature[];
  variants?: number;
  isFeatured?: boolean;
  deliveryInfo?: string;
  category: string;
}

/**
 * Utility function to convert backend product to frontend format
 */
export function transformBackendProduct(backendProduct: BackendProduct): Product {
  const salePrice = parseFloat(backendProduct.sale_price);
  const basePrice = parseFloat(backendProduct.base_price);

  // Logging for debugging image issues
  console.log(`[transformBackendProduct] Transforming product ${backendProduct.product_id} (${backendProduct.name}):`, {
    mainImage: backendProduct.mainImage,
    hasMainImage: !!backendProduct.mainImage,
    mainImageType: typeof backendProduct.mainImage,
    mainImageLength: backendProduct.mainImage?.length,
    willUseFallback: !backendProduct.mainImage,
  });

  const transformed = {
    id: backendProduct.product_id.toString(),
    name: backendProduct.name,
    brand: undefined, // Will be populated if we have brand data
    price: salePrice,
    originalPrice: basePrice > salePrice ? basePrice : undefined,
    priceRange: backendProduct.price_range || '',
    rating: 0, // Will be populated from reviews
    reviewCount: '0 reviews',
    image: backendProduct.mainImage || '/logo.png',
    features: [], // Will be populated from product details
    variants: undefined, // Will be populated from variants count
    isFeatured: backendProduct.ispopular,
    deliveryInfo: 'Free delivery',
    category: backendProduct.category_id?.toString() || 'uncategorized',
  };

  if (!backendProduct.mainImage) {
    console.warn(`[transformBackendProduct] ⚠️ Product ${backendProduct.product_id} has no mainImage, using fallback`);
  }

  return transformed;
}

/**
 * Utility function to convert backend product with details to frontend format
 */
export function transformBackendProductWithDetails(
  backendProduct: BackendProductWithDetails
): Product {
  const baseProduct = transformBackendProduct(backendProduct);

  return {
    ...baseProduct,
    brand: backendProduct.brand?.brand_name,
    rating: backendProduct.rating || 0,
    reviewCount: backendProduct.reviewCount
      ? `Based on ${backendProduct.reviewCount}+ reviews`
      : '0 reviews',
    variants: backendProduct.variants?.length,
    category: backendProduct.category?.category_name || 'uncategorized',
  };
}

