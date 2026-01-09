import React, { useState } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote, Users, Award, ThumbsUp, Clock, ArrowRight } from 'lucide-react';
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

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    location: 'Manchester',
    rating: 5,
    review: 'Absolutely incredible experience! The team helped me find the perfect mattress for my back pain. I\'ve never slept better in my life. The quality is outstanding and the customer service was exceptional.',
    verified: true,
  },
  {
    id: '2',
    name: 'James Wilson',
    location: 'London',
    rating: 5,
    review: 'Best purchase I\'ve made this year. The delivery was quick, the setup was easy, and the mattress is incredibly comfortable. Worth every penny!',
    verified: true,
  },
  {
    id: '3',
    name: 'Emma Thompson',
    location: 'Birmingham',
    rating: 5,
    review: 'I was skeptical at first, but after trying the mattress for a month, I can confidently say it\'s transformed my sleep. No more waking up with aches and pains.',
    verified: true,
  },
];

const stats: Stat[] = [
  { icon: <Users size={24} />, value: '15,000+', label: 'Happy Customers' },
  { icon: <Star size={24} />, value: '4.9/5', label: 'Average Rating' },
  { icon: <ThumbsUp size={24} />, value: '98%', label: 'Satisfaction Rate' },
  { icon: <Clock size={24} />, value: '25+', label: 'Years Experience' },
];

const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <Award size={16} />
            <span>Trusted by 15,000+ Customers</span>
          </div>
          <h2 className={styles.title}>What Our Customers Say</h2>
          <p className={styles.subtitle}>
            Don't just take our word for it. Hear from thousands of satisfied customers who've transformed their homes with us.
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

        {/* CTA */}
        <div className={styles.ctaWrapper}>
          <button className={styles.ctaButton}>
            Read More Reviews
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

