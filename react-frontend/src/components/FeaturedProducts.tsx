import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import type { Product } from '../types';
import { transformBackendProduct } from '../types/product';
import { productService } from '../services/product.service';
import styles from './FeaturedProducts.module.css';

const categoryTabs = [
  'All',
  'Mattresses',
  'Beds',
  'Sofas',
  'Pillows',
  'Toppers',
  'Bunkbeds',
  'Kids',
];

interface FeaturedProductsProps {
  title?: string;
  subtitle?: string;
  showTabs?: boolean;
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  title = 'Handpicked Favourites',
  subtitle = 'Discover our most-loved collections',
  showTabs = true,
}) => {
  const [activeTab, setActiveTab] = useState(categoryTabs[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch products based on active tab
        const response = await productService.getProducts({
          page: 1,
          pageSize: 8,
          isPopular: true, // Show popular products
        });

        // Transform backend products to frontend format
        const transformedProducts = response.data.map(transformBackendProduct);
        setProducts(transformedProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [activeTab]);

  return (
    <section className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>

          {/* Category Tabs */}
          {showTabs && (
            <div className={styles.tabs}>
              {categoryTabs.map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingContainer}>
            <p>Loading products...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={styles.errorContainer}>
            <p>{error}</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <div className={styles.productsGrid}>
            {products.length > 0 ? (
              products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <p>No products available.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;


