import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, Shield, Award, Sparkles, ArrowRight } from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './DealOfTheDay.module.css';

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

interface SideProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  description: string;
  href: string;
}

const sideProducts: SideProduct[] = [
  {
    id: '1',
    name: '17 cm Deep 6000 Orthopedic Memory Foam Mattress',
    price: 110.99,
    originalPrice: 135.00,
    discount: 10,
    description: 'The Bedora Living 17cm deep 6000 Orthopedic Memory Foam Mattress combines pressure-relieving memory foam with a resilient reflex foam base.',
    href: '/products/mattresses/1',
  },
  {
    id: '2',
    name: '16 cm Reflex & Memory Foam King Mattress',
    price: 122.89,
    originalPrice: 200.74,
    discount: 5,
    description: 'The Bedora Living 16cm Reflex & Memory Foam King Mattress combines a contouring memory foam layer with a resilient reflex foam base.',
    href: '/products/mattresses/2',
  },
  {
    id: '3',
    name: 'Bounce-Back Pillow Bundle – Supportive Hollow Fibre Pillows',
    price: 25.00,
    originalPrice: 40.00,
    discount: 10,
    description: 'Elevate your sleeping experience with the KKS Bounce Back Pillow Bundle. Crafted with 100% virgin hollow fibre.',
    href: '/products/pillows/1',
  },
];

const DealOfTheDay: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ hours: 21, minutes: 15, seconds: 8 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          // Reset to 24 hours when timer reaches 0
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  return (
    <section className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Deal of the Day</h2>
          <div className={styles.timerWrapper}>
            <div className={styles.timerLabel}>
              <Clock size={16} />
              <span>Offer ends in:</span>
            </div>
            <div className={styles.timer}>
              <div className={styles.timerBlock}>
                <span className={styles.timerValue}>{formatTime(timeLeft.hours)}</span>
                <span className={styles.timerUnit}>Hours</span>
              </div>
              <span className={styles.timerSeparator}>:</span>
              <div className={styles.timerBlock}>
                <span className={styles.timerValue}>{formatTime(timeLeft.minutes)}</span>
                <span className={styles.timerUnit}>Minutes</span>
              </div>
              <span className={styles.timerSeparator}>:</span>
              <div className={styles.timerBlock}>
                <span className={styles.timerValue}>{formatTime(timeLeft.seconds)}</span>
                <span className={styles.timerUnit}>Seconds</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          {/* Main Deal */}
          <div className={styles.mainDeal}>
            <div className={styles.mainImageSection}>
              <img src={logo} alt="Deal Product" className={styles.mainImage} />
              <span className={styles.discountBadge}>40%</span>
              <div className={styles.ratingBadge}>
                <div className={styles.stars}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} fill="#f59e0b" className={styles.starFilled} />
                  ))}
                </div>
                <span>"4.6"</span>
              </div>
            </div>
            
            <div className={styles.mainContent}>
              <div className={styles.mainInfo}>
                <h3 className={styles.mainTitle}>
                  Mito 3in1 - Pouffe Stool, Recliner Chair & Bed
                </h3>
                <p className={styles.mainDescription}>
                  The Filton Futon Bunk Bed is a stylish and versatile furniture piece designed 
                  for kids, teens, or rooms where space is at a premium. It combines a sleeping 
                  area up top with a lounging futon base on the bottom.
                </p>
              </div>

              <div className={styles.priceSection}>
                <div className={styles.prices}>
                  <span className={styles.currentPrice}>£188.99</span>
                  <span className={styles.originalPrice}>£299.00</span>
                  <span className={styles.savings}>Save £110.01</span>
                </div>
                <p className={styles.deliveryNote}>Free delivery & 14-night trial included</p>
              </div>

              <div className={styles.features}>
                <div className={styles.feature}>
                  <Shield size={16} />
                  <span>14-Night Trial</span>
                </div>
                <div className={styles.feature}>
                  <Award size={16} />
                  <span>1-Year Warranty</span>
                </div>
                <div className={styles.feature}>
                  <Sparkles size={16} />
                  <span>Premium Quality</span>
                </div>
              </div>

              <div className={styles.actions}>
                <Link to="/products/sofas/1" className={styles.buyButton}>
                  Buy Now
                </Link>
                <button className={styles.claimButton}>
                  <Sparkles size={18} />
                  Claim This Deal Now
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Side Products */}
          <div className={styles.sideProducts}>
            {sideProducts.map((product) => (
              <div key={product.id} className={styles.sideProduct}>
                <div className={styles.sideImageWrapper}>
                  <img src={logo} alt={product.name} className={styles.sideImage} />
                  <span className={styles.sideDiscount}>{product.discount}%</span>
                </div>
                <div className={styles.sideContent}>
                  <h4 className={styles.sideName}>{product.name}</h4>
                  <p className={styles.sideDescription}>{product.description}</p>
                  <div className={styles.sidePriceRow}>
                    <div className={styles.sidePrices}>
                      <span className={styles.sideCurrentPrice}>£{product.price.toFixed(2)}</span>
                      <span className={styles.sideOriginalPrice}>£{product.originalPrice.toFixed(2)}</span>
                    </div>
                    <Link to={product.href} className={styles.sideBuyButton}>
                      Buy Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DealOfTheDay;

