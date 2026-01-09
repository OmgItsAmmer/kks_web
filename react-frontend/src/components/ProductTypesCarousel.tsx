import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Star } from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import ProductCard from './ProductCard';
import type { Product } from '../types';
import styles from './ProductTypesCarousel.module.css';

interface ProductType {
  id: string;
  name: string;
  description: string;
  href: string;
}

const mattressTypes: ProductType[] = [
  {
    id: '1',
    name: 'Memory Foam',
    description: 'A memory foam mattress offers exceptional comfort by contouring to the shape of your body, providing personalized support throughout the night. It helps relieve pressure points, making it ideal for those with joint or back pain.',
    href: '/products/mattresses/memory-foam',
  },
  {
    id: '2',
    name: 'Orthopedic',
    description: 'A memory foam mattress is designed to provide superior comfort and support, especially for those dealing with back or joint pain. Its orthopedic qualities help align the spine properly by contouring to the natural curves of your body.',
    href: '/products/mattresses/orthopedic',
  },
  {
    id: '3',
    name: 'Hybrid',
    description: 'A hybrid mattress combines the best of both worlds—supportive innerspring coils and pressure-relieving memory foam or latex layers. This unique construction offers balanced comfort.',
    href: '/products/mattresses/hybrid',
  },
  {
    id: '4',
    name: 'Pocket Springs',
    description: 'A pocket spring mattress features individually wrapped coils that move independently, offering targeted support to every part of your body. This design helps maintain proper spinal alignment.',
    href: '/products/mattresses/pocket-springs',
  },
];

const featuredProducts: Product[] = [
  {
    id: '1',
    name: 'Soft Rock Modular Seating System',
    brand: 'KKS Online',
    price: 110.50,
    originalPrice: 410.29,
    rating: 4.5,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [{ label: 'Blue Foam' }, { label: 'Hypoallergenic' }],
    variants: 12,
    isFeatured: true,
    deliveryInfo: 'Free delivery Tomorrow',
    category: 'mattresses',
  },
  {
    id: '2',
    name: 'SpringFlexi 2000 Mattress',
    brand: 'KKS Online',
    price: 122.90,
    originalPrice: 311.03,
    rating: 4.6,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [{ label: 'Reflex Foam' }, { label: 'Coil Spring' }, { label: 'Orthopedic Support' }],
    variants: 4,
    isFeatured: true,
    deliveryInfo: 'Free delivery Tomorrow',
    category: 'mattresses',
  },
  {
    id: '3',
    name: 'Happy Kids Foam Mattress',
    price: 104.00,
    originalPrice: 196.15,
    rating: 4.5,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [{ label: 'Pocket Springs' }, { label: 'Anti-Dust Mite' }],
    variants: 3,
    isFeatured: true,
    deliveryInfo: 'Free delivery Tomorrow',
    category: 'mattresses',
  },
  {
    id: '4',
    name: 'ZenRest 3000 Pocket Spring Mattress',
    brand: 'KKS Online',
    price: 188.50,
    originalPrice: 641.91,
    rating: 4.7,
    reviewCount: 'Based on 1k+ reviews',
    image: '/logo.png',
    features: [{ label: 'Pocket Springs' }, { label: 'Reflex Foam' }, { label: 'Medium Firm' }],
    variants: 5,
    isFeatured: true,
    deliveryInfo: 'Free delivery Tomorrow',
    category: 'mattresses',
  },
];

interface ProductTypesCarouselProps {
  title?: string;
  subtitle?: string;
  types?: ProductType[];
  products?: Product[];
  viewAllLink?: string;
  viewAllText?: string;
}

const ProductTypesCarousel: React.FC<ProductTypesCarouselProps> = ({
  title = 'Our Mattress Types',
  subtitle = 'Tailored comfort, trusted support — discover mattresses made just for you.',
  types = mattressTypes,
  products = featuredProducts,
  viewAllLink = '/mattresses',
  viewAllText = 'View All Mattresses',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = (index: number) => {
    const newIndex = Math.max(0, Math.min(index, types.length - 1));
    setCurrentIndex(newIndex);
    
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.children[0] as HTMLElement;
      if (scrollAmount) {
        const width = scrollAmount.offsetWidth + 24; // including gap
        carouselRef.current.scrollTo({
          left: width * newIndex,
          behavior: 'smooth',
        });
      }
    }
  };

  const handlePrev = () => scrollToIndex(currentIndex - 1);
  const handleNext = () => scrollToIndex(currentIndex + 1);

  return (
    <section className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.content}>
          {/* Types Carousel */}
          <div className={styles.carouselSection}>
            <button 
              className={`${styles.navButton} ${styles.navButtonPrev}`}
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous"
            >
              <ChevronLeft size={24} />
            </button>

            <div className={styles.carousel} ref={carouselRef}>
              {types.map((type) => (
                <div key={type.id} className={styles.typeCard}>
                  <div className={styles.typeImageWrapper}>
                    <img src={logo} alt={type.name} className={styles.typeImage} />
                  </div>
                  <div className={styles.typeContent}>
                    <div className={styles.typeIconWrapper}>
                      <Star size={20} />
                    </div>
                    <h3 className={styles.typeName}>{type.name}</h3>
                  </div>
                  <p className={styles.typeDescription}>{type.description}</p>
                  <Link to={type.href} className={styles.typeButton}>
                    Buy Now
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>

            <button 
              className={`${styles.navButton} ${styles.navButtonNext}`}
              onClick={handleNext}
              disabled={currentIndex >= types.length - 1}
              aria-label="Next"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Featured Products */}
          <div className={styles.productsSection}>
            <div className={styles.productsHeader}>
              <h3 className={styles.productsTitle}>Featured Mattresses</h3>
              <p className={styles.productsSubtitle}>Discover our most popular mattress selections</p>
            </div>
            
            <div className={styles.productsGrid}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <Link to={viewAllLink} className={styles.viewAllButton}>
              {viewAllText}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductTypesCarousel;

