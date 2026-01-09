import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './HeroSection.module.css';

interface CategoryCard {
  name: string;
  description: string;
  href: string;
}

const categoryCards: CategoryCard[] = [
  { name: 'sofa', description: 'Premium comfort for your living space', href: '/sofas' },
  { name: 'Beds', description: 'Elegant designs for peaceful sleep', href: '/beds' },
  { name: 'mattress', description: 'Ultimate comfort and support', href: '/mattresses' },
  { name: 'toppers', description: 'Complete your perfect setup', href: '/toppers' },
];

const HeroSection: React.FC = () => {
  return (
    <section className={styles.heroSection}>
      <div className="container">
        <div className={styles.heroGrid}>
          {/* Main Banner */}
          <div className={styles.mainBanner}>
            <div className={styles.bannerImage}>
              <img src={logo} alt="Premium Collection" className={styles.heroImage} />
              <div className={styles.bannerOverlay}>
                <span className={styles.newArrival}>NEW ARRIVAL</span>
                <h2 className={styles.bannerTitle}>PREMIUM</h2>
                <h3 className={styles.bannerSubtitle}>COLLECTION</h3>
                <div className={styles.priceSection}>
                  <span className={styles.price}>£499</span>
                  <span className={styles.saleTag}>SALE UP TO 40% OFF</span>
                </div>
                <button className={styles.shopButton}>
                  Shop Now
                </button>
              </div>
            </div>
          </div>

          {/* Side Banners */}
          <div className={styles.sideBanners}>
            <Link to="/beds" className={styles.sideBanner}>
              <img src={logo} alt="Bedroom Collection" className={styles.sideImage} />
              <span className={styles.sideLabel}>Bedroom</span>
            </Link>
            <Link to="/sofas" className={styles.sideBanner}>
              <img src={logo} alt="Living Room" className={styles.sideImage} />
              <span className={styles.sideLabel}>Living Room</span>
            </Link>
          </div>
        </div>

        {/* Category Cards */}
        <div className={styles.categoryCards}>
          {categoryCards.map((card) => (
            <Link key={card.name} to={card.href} className={styles.categoryCard}>
              <div className={styles.cardImageWrapper}>
                <img src={logo} alt={card.name} className={styles.cardImage} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{card.name}</h3>
                <p className={styles.cardDescription}>{card.description}</p>
                <span className={styles.cardButton}>
                  Shop Now
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

