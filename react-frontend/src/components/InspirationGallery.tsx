import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Award } from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import ProductCard from './ProductCard';
import type { Product } from '../types';
import styles from './InspirationGallery.module.css';

interface InspirationItem {
  id: string;
  title: string;
  description: string;
  href: string;
}

const inspirationItems: InspirationItem[] = [
  {
    id: '1',
    title: 'Premium Quality',
    description: 'The Devon Bed Frame blends eco-conscious construction with elegant simplicity. Made from sustainably sourced Brazilian pine.',
    href: '/products/beds/1',
  },
  {
    id: '2',
    title: 'Elegant Design',
    description: 'The Easton Wooden Single Bed with Shelf Headboard offers a perfect blend of style and functionality.',
    href: '/products/beds/2',
  },
  {
    id: '3',
    title: 'Stylish',
    description: 'The London Day Bed is a stylish and practical piece of furniture, perfect for small spaces.',
    href: '/products/beds/3',
  },
  {
    id: '4',
    title: 'Durable',
    description: 'The Shanghai White and Grey Wooden Bed exudes elegant simplicity with its shaker-style frame.',
    href: '/products/beds/4',
  },
  {
    id: '5',
    title: 'Modern',
    description: 'The Mission Storage Bed is perfect for keeping your bedroom organized and stylish.',
    href: '/products/beds/5',
  },
];

const featuredBeds: Product[] = [
  {
    id: '1',
    name: 'Easton Wooden Single Bed Frame with Shelf Headboard',
    brand: 'KKS Online',
    price: 130.00,
    originalPrice: 250.00,
    rating: 4.9,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [
      { label: 'Solid Wood Construction' },
      { label: 'Modern Design' },
      { label: 'Space Saving' },
      { label: 'Easy Assembly' },
    ],
    variants: 2,
    isFeatured: true,
    deliveryInfo: 'Free delivery Tomorrow',
    category: 'beds',
  },
  {
    id: '2',
    name: 'Shanghai White and Grey Wooden Bed',
    brand: 'KKS Online',
    price: 155.86,
    rating: 4.5,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [
      { label: 'Solid Wood Construction' },
      { label: 'Easy Assembly' },
      { label: 'Durable Finish' },
      { label: 'Classic Style' },
    ],
    variants: 4,
    isFeatured: true,
    deliveryInfo: 'Free delivery Tomorrow',
    category: 'beds',
  },
  {
    id: '3',
    name: 'Daybed Sofa By Day With Drawers And Storage Cabinet',
    brand: 'KKS Online',
    price: 279.99,
    originalPrice: 469.99,
    rating: 4.5,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [
      { label: 'Solid Wood Construction' },
      { label: 'Easy Assembly' },
      { label: 'Durable Finish' },
      { label: 'Modern Design' },
    ],
    variants: 1,
    isFeatured: true,
    deliveryInfo: 'Free delivery Tomorrow',
    category: 'beds',
  },
  {
    id: '4',
    name: 'Atlantic Single Wooden Bed',
    brand: 'KKS Online',
    price: 119.99,
    originalPrice: 229.99,
    rating: 4.5,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [
      { label: 'Solid Wood Construction' },
      { label: 'Modern Design' },
      { label: 'Classic Style' },
      { label: 'Easy Assembly' },
    ],
    variants: 1,
    isFeatured: true,
    deliveryInfo: 'Free delivery Tomorrow',
    category: 'beds',
  },
];

const InspirationGallery: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = (index: number) => {
    const newIndex = Math.max(0, Math.min(index, inspirationItems.length - 1));
    setCurrentIndex(newIndex);
    
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.children[0] as HTMLElement;
      if (scrollAmount) {
        const width = scrollAmount.offsetWidth + 24;
        carouselRef.current.scrollTo({
          left: width * newIndex,
          behavior: 'smooth',
        });
      }
    }
  };

  return (
    <section className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Turn Your Bedroom Into Inspiration</h2>
          <p className={styles.subtitle}>
            Share your perfect bed, sofa or mattress look with us on Instagram.
          </p>
          <p className={styles.subtext}>
            Your style could be our next feature — and inspire others to rest better
          </p>
        </div>

        <div className={styles.content}>
          {/* Carousel */}
          <div className={styles.carouselSection}>
            <button 
              className={`${styles.navButton} ${styles.navButtonPrev}`}
              onClick={() => scrollToIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
              aria-label="Previous"
            >
              <ChevronLeft size={24} />
            </button>

            <div className={styles.carousel} ref={carouselRef}>
              {inspirationItems.map((item) => (
                <div key={item.id} className={styles.inspirationCard}>
                  <div className={styles.cardImageWrapper}>
                    <img src={logo} alt={item.title} className={styles.cardImage} />
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardIconWrapper}>
                      <Award size={20} />
                    </div>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                  </div>
                  <p className={styles.cardDescription}>{item.description}</p>
                  <Link to={item.href} className={styles.cardButton}>
                    Buy Now
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>

            <button 
              className={`${styles.navButton} ${styles.navButtonNext}`}
              onClick={() => scrollToIndex(currentIndex + 1)}
              disabled={currentIndex >= inspirationItems.length - 1}
              aria-label="Next"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Featured Beds */}
          <div className={styles.productsSection}>
            <div className={styles.productsHeader}>
              <h3 className={styles.productsTitle}>Featured Beds</h3>
              <p className={styles.productsSubtitle}>Transform your bedroom with our premium bed collection</p>
            </div>
            
            <div className={styles.productsGrid}>
              {featuredBeds.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <Link to="/beds" className={styles.viewAllButton}>
              View All Beds
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InspirationGallery;

