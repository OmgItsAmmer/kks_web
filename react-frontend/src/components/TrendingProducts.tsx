import React from 'react';
import { TrendingUp } from 'lucide-react';
import ProductCard from './ProductCard';
import type { Product } from '../types';
import styles from './TrendingProducts.module.css';

const trendingProducts: Product[] = [
  {
    id: '1',
    name: 'Fairlight Dorset Bed In Waxed',
    brand: 'KKS Online',
    price: 112.99,
    originalPrice: 325.99,
    rating: 4.7,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [
      { label: 'Solid Wood Construction' },
      { label: 'Modern Design' },
      { label: 'Classic Style' },
      { label: 'Easy Assembly' },
      { label: 'Durable Finish' },
      { label: 'Space Saving' },
    ],
    variants: 4,
    deliveryInfo: 'Free delivery',
    category: 'beds',
  },
  {
    id: '2',
    name: 'Glory White Wooden Bed Frame',
    brand: 'KKS Online',
    price: 139.99,
    originalPrice: 315.00,
    rating: 4.5,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [
      { label: 'Solid Wood Construction' },
      { label: 'Easy Assembly' },
      { label: 'Classic Style' },
      { label: 'Contemporary Look' },
      { label: 'Durable Finish' },
      { label: 'Modern Design' },
    ],
    variants: 4,
    deliveryInfo: 'Free delivery',
    category: 'beds',
  },
  {
    id: '3',
    name: 'Extra Firm Hardrock Mattress – Super Firm Reflex Foam',
    brand: 'KKS Online',
    price: 110.50,
    originalPrice: 380.00,
    rating: 4.8,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [
      { label: 'Blue Foam' },
      { label: 'Hypoallergenic' },
      { label: 'Reflex Foam' },
      { label: 'Washable Cover' },
      { label: 'Back Support' },
      { label: 'Orthopedic Support' },
    ],
    variants: 12,
    deliveryInfo: 'Free delivery',
    category: 'mattresses',
  },
  {
    id: '4',
    name: 'Memory 7500 Mattress Topper – 7.5 cm Memory Foam',
    brand: 'KKS Online',
    price: 98.80,
    originalPrice: 250.00,
    rating: 4.9,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [
      { label: 'Memory Foam' },
      { label: 'Temperature Regulation' },
      { label: 'Pressure Relief' },
      { label: 'Back Support' },
      { label: 'Hypoallergenic' },
      { label: 'Eco-Friendly' },
    ],
    variants: 6,
    deliveryInfo: 'Free delivery',
    category: 'toppers',
  },
];

const TrendingProducts: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <TrendingUp size={16} />
            <span>TRENDING NOW</span>
          </div>
          <h2 className={styles.title}>Wake Up to What's Trending</h2>
          <p className={styles.subtitle}>
            Zzz-worthy topics too hot to snooze. Discover the latest innovations in sleep technology and comfort.
          </p>
        </div>

        {/* Products Grid */}
        <div className={styles.productsGrid}>
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingProducts;

