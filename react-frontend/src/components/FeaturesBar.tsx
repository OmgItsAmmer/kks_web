import React from 'react';
import { RotateCcw, Truck, CreditCard, ShieldCheck, Clock } from 'lucide-react';
import styles from './FeaturesBar.module.css';

interface Feature {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const features: Feature[] = [
  {
    icon: <RotateCcw size={24} />,
    title: 'Easy Returns',
    subtitle: 'No Worries',
  },
  {
    icon: <Truck size={24} />,
    title: 'Quick Delivery',
    subtitle: 'Instant Comfort',
  },
  {
    icon: <ShieldCheck size={24} />,
    title: 'Quality Assured',
    subtitle: 'Fresh Products',
  },
  {
    icon: <CreditCard size={24} />,
    title: 'Secure Checkout',
    subtitle: 'Multiple Payment Options',
  },
  {
    icon: <Clock size={24} />,
    title: 'Open Daily',
    subtitle: 'Extended Hours',
  },
];

const FeaturesBar: React.FC = () => {
  return (
    <div className={styles.featuresBar}>
      <div className={styles.scrollContainer}>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureItem}>
              <div className={styles.iconWrapper}>
                {feature.icon}
              </div>
              <div className={styles.textWrapper}>
                <span className={styles.title}>{feature.title}</span>
                <span className={styles.subtitle}>{feature.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesBar;

