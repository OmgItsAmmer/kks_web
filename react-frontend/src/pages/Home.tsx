import React, { useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import FeaturesBar from '../components/FeaturesBar';
import HeroSection from '../components/HeroSection';
import FeaturedProducts from '../components/FeaturedProducts';
import TestimonialsSection from '../components/TestimonialsSection';
// Commented out components - uncomment when needed:
// import ComfortCategories from '../components/ComfortCategories';
// import MattressQuizCTA from '../components/MattressQuizCTA';
// import ProductTypesCarousel from '../components/ProductTypesCarousel';
// import DealOfTheDay from '../components/DealOfTheDay';
// import InspirationGallery from '../components/InspirationGallery';
// import TrendingProducts from '../components/TrendingProducts';
// import GuidesSection from '../components/GuidesSection';

const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // Get category from URL params
  const categoryParam = searchParams.get('category');
  const initialCategory = useMemo(() => {
    if (!categoryParam || categoryParam === 'all') {
      return 'all';
    }
    const categoryId = parseInt(categoryParam, 10);
    return isNaN(categoryId) ? 'all' : categoryId;
  }, [categoryParam]);

  // Scroll to featured products section when category param is present
  useEffect(() => {
    if (categoryParam) {
      // Small delay to ensure DOM is ready and category is updated
      const scrollTimer = setTimeout(() => {
        const element = document.getElementById('featured-products');
        if (element) {
          const yOffset = -80; // Offset for header if needed
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 300); // Increased delay to ensure category tab is active
      
      return () => clearTimeout(scrollTimer);
    }
  }, [categoryParam]);

  return (
    <main>
      {/* Features Bar - Trust indicators */}
      <FeaturesBar />

      {/* Hero Section with banner and category cards */}
      <HeroSection />

      {/* Handpicked Favourites with category tabs */}
      <FeaturedProducts
        title="All Categories"
        subtitle="Discover our most-loved collections"
        showTabs={true}
        initialCategory={initialCategory}
      />

      {/* Sleep Luxury Products */}
      {/* <FeaturedProducts 
        title="Sleep Luxury, Every Night"
        subtitle="Discover our premium collection of mattresses designed for ultimate comfort and luxury."
        showTabs={false}
      /> */}

      {/* Shop by Comfort & Support */}
      {/* <ComfortCategories /> */}

      {/* Mattress Quiz CTA */}
      {/* <MattressQuizCTA /> */}

      {/* Mattress Types Carousel with Featured Products */}
      {/* <ProductTypesCarousel 
        title="Our Mattress Types"
        subtitle="Tailored comfort, trusted support — discover mattresses made just for you."
        viewAllLink="/mattresses"
        viewAllText="View All Mattresses" 
      /> */}

      {/* Deal of the Day */}
      {/* <DealOfTheDay /> */}

      {/* Inspiration Gallery with Featured Beds */}
      {/* <InspirationGallery /> */}

      {/* Trending Products */}
      {/* <TrendingProducts /> */}

      {/* Buying Guides Section */}
      {/* <GuidesSection /> */}

      {/* Customer Testimonials */}
      <TestimonialsSection />
    </main>
  );
};

export default Home;
