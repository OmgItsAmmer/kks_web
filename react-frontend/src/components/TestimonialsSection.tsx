import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote, Users, Award, ThumbsUp, Clock } from 'lucide-react';
import { reviewService, type BackendReview } from '../services/review.service';
import styles from './TestimonialsSection.module.css';

interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  review: string;
  verified: boolean;
}

interface Stat {
  icon: React.ReactNode;
  value: string;
  label: string;
}

const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [stats, setStats] = useState<Stat[]>([
    { icon: <Users size={24} />, value: '0', label: 'Happy Customers' },
    { icon: <Star size={24} />, value: '0/5', label: 'Average Rating' },
    { icon: <ThumbsUp size={24} />, value: '98%', label: 'Satisfaction Rate' },
    { icon: <Clock size={24} />, value: '25+', label: 'Years Experience' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        console.log('[TestimonialsSection] Fetching reviews...');
        
        // Fetch reviews with rating > 3 for testimonials
        const reviewsResponse = await reviewService.getReviewsByRating(3, 10);
        
        // Fetch happy customers stats (rating > 4)
        const statsResponse = await reviewService.getHappyCustomersStats();

        if (reviewsResponse.success && reviewsResponse.data) {
          const transformedTestimonials = reviewsResponse.data.map((review: BackendReview) => ({
            id: review.review_id.toString(),
            name: review.customerName || 'Anonymous',
            location: 'Pakistan', // Default location
            rating: review.rating,
            review: review.review,
            verified: true,
          }));
          
          setTestimonials(transformedTestimonials);
          console.log('[TestimonialsSection] ✅ Testimonials loaded:', transformedTestimonials.length);
        }

        if (statsResponse.success && statsResponse.data) {
          const { count, averageRating } = statsResponse.data;
          
          setStats([
            { icon: <Users size={24} />, value: `${count.toLocaleString()}+`, label: 'Happy Customers' },
            { icon: <Star size={24} />, value: `${averageRating.toFixed(1)}/5`, label: 'Average Rating' },
            { icon: <ThumbsUp size={24} />, value: '98%', label: 'Satisfaction Rate' },
            { icon: <Clock size={24} />, value: '25+', label: 'Years Experience' },
          ]);
          console.log('[TestimonialsSection] ✅ Stats updated:', count, 'happy customers');
        }
      } catch (error: any) {
        console.error('[TestimonialsSection] ❌ Error loading testimonials:', error);
        // Use fallback data
        setTestimonials([
          {
            id: '1',
            name: 'Customer',
            location: 'Pakistan',
            rating: 5,
            review: 'Great products and excellent service!',
            verified: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const currentTestimonial = testimonials.length > 0 ? testimonials[currentIndex] : null;

  if (loading) {
    return (
      <section className={styles.section}>
        <div className="container">
          <div className={styles.header}>
            <h2 className={styles.title}>Loading testimonials...</h2>
          </div>
        </div>
      </section>
    );
  }

  if (!currentTestimonial) {
    return (
      <section className={styles.section}>
        <div className="container">
          <div className={styles.header}>
            <h2 className={styles.title}>No testimonials available</h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials-section" className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <Award size={16} />
            <span>Trusted by {stats[0].value} Customers</span>
          </div>
          <h2 className={styles.title}>What Our Customers Say</h2>
          <p className={styles.subtitle}>
            Don't just take our word for it. Hear from thousands of satisfied customers who love our products.
          </p>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statCard}>
              <div className={styles.statIcon}>{stat.icon}</div>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Testimonial Carousel */}
        <div className={styles.carouselWrapper}>
          <button 
            className={`${styles.navButton} ${styles.navButtonPrev}`}
            onClick={handlePrev}
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={24} />
          </button>

          <div className={styles.testimonialCard}>
            <div className={styles.quoteIcon}>
              <Quote size={32} />
            </div>
            
            <div className={styles.stars}>
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={20} 
                  fill={i < currentTestimonial.rating ? '#f59e0b' : 'none'}
                  className={i < currentTestimonial.rating ? styles.starFilled : styles.starEmpty}
                />
              ))}
            </div>

            <blockquote className={styles.quote}>
              "{currentTestimonial.review}"
            </blockquote>

            <div className={styles.author}>
              <div className={styles.authorAvatar}>
                {currentTestimonial.name.charAt(0)}
                {currentTestimonial.verified && (
                  <span className={styles.verifiedBadge}>✓</span>
                )}
              </div>
              <div className={styles.authorInfo}>
                <h4 className={styles.authorName}>{currentTestimonial.name}</h4>
                <p className={styles.authorMeta}>Verified Buyer</p>
                <p className={styles.authorLocation}>{currentTestimonial.location}</p>
              </div>
            </div>
          </div>

          <button 
            className={`${styles.navButton} ${styles.navButtonNext}`}
            onClick={handleNext}
            aria-label="Next testimonial"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Dots */}
        <div className={styles.dots}>
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

