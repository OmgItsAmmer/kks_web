import React from 'react';
import FeaturesBar from '../components/FeaturesBar';
import HeroSection from '../components/HeroSection';
import FeaturedProducts from '../components/FeaturedProducts';
import ComfortCategories from '../components/ComfortCategories';
import MattressQuizCTA from '../components/MattressQuizCTA';
import ProductTypesCarousel from '../components/ProductTypesCarousel';
import DealOfTheDay from '../components/DealOfTheDay';
import InspirationGallery from '../components/InspirationGallery';
import TrendingProducts from '../components/TrendingProducts';
import GuidesSection from '../components/GuidesSection';
import TestimonialsSection from '../components/TestimonialsSection';

const Home: React.FC = () => {
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
