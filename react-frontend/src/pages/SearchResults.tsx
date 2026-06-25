import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productService } from '../services/product.service';
import type { BackendProduct } from '../services/product.service';
import Loader from '../components/Loader';
import styles from './SearchResults.module.css';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (query) {
      loadProducts();
    }
  }, [query, page]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await productService.getProducts({
        q: query,
        page,
        pageSize,
      });
      setProducts(response.data);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Error loading search results:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container">
      <div className={styles.searchResults}>
        <div className={styles.header}>
          <h1>Search Results for "{query}"</h1>
          <p className={styles.resultCount}>{total} products found</p>
        </div>

        {loading ? (
          <Loader message="Loading..." variant="inline" />
        ) : products.length > 0 ? (
          <>
            <div className={styles.productGrid}>
              {products.map((product) => (
                <Link
                  key={product.product_id}
                  to={`/product/${product.product_id}`}
                  className={styles.productCard}
                >
                  {product.mainImage && (
                    <img
                      src={product.mainImage}
                      alt={product.name}
                      className={styles.productImage}
                    />
                  )}
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    <div className={styles.pricing}>
                      <span className={styles.fromLabel}>
                        {product.price_range && product.price_range.trim().length > 0 ? 'price range' : 'from'}
                      </span>
                      <div className={styles.productPrices}>
                        <span className={styles.productPrice}>
                          {product.price_range && product.price_range.trim().length > 0
                            ? `Rs ${product.price_range}`
                            : `Rs ${parseFloat(product.sale_price).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`}
                        </span>
                        {!(product.price_range && product.price_range.trim().length > 0) && parseFloat(product.base_price) > parseFloat(product.sale_price) && (
                          <span className={styles.originalPrice}>
                            Rs {parseFloat(product.base_price).toLocaleString('en-PK', { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={styles.paginationButton}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.noResults}>
            <p>No products found for "{query}"</p>
            <Link to="/" className={styles.backButton}>
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
