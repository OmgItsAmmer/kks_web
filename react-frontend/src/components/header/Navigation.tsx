import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Sparkles, HelpCircle } from 'lucide-react';
import styles from './Navigation.module.css';

interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Mattresses', href: '/mattresses', hasDropdown: true },
  { label: 'Beds', href: '/beds', hasDropdown: true },
  { label: 'Sofas', href: '/sofas', hasDropdown: true },
  { label: 'Kids', href: '/kids', hasDropdown: true },
  { label: 'Pillows', href: '/pillows', hasDropdown: true },
  { label: 'Toppers', href: '/toppers', hasDropdown: true },
  { label: 'Bunkbeds', href: '/bunkbeds', hasDropdown: true },
  { label: 'Guide', href: '/guides' },
];

interface NavigationProps {
  isOpen?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ isOpen = true }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <nav className={`${styles.navigation} ${isOpen ? styles.open : ''}`}>
      <div className="container">
        <div className={styles.navContent}>
          {/* Main Nav Items */}
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li 
                key={item.label} 
                className={styles.navItem}
                onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link to={item.href} className={styles.navLink}>
                  <span>{item.label}</span>
                  {item.hasDropdown && <ChevronDown size={14} className={styles.dropdownIcon} />}
                </Link>
              </li>
            ))}
          </ul>

          {/* Promo Items */}
          <div className={styles.promoItems}>
            {/* Sales & Clearance */}
            <Link to="/sale" className={styles.promoItem}>
              <div className={styles.promoIcon}>
                <Sparkles size={20} />
              </div>
              <div className={styles.promoText}>
                <span className={styles.promoTitle}>SALES & CLEARANCE</span>
                <span className={styles.promoSubtitle}>Hurry! Discounts Up to 60%</span>
              </div>
            </Link>

            {/* Mattress Quiz */}
            <Link to="/mattress-finder" className={styles.promoItemQuiz}>
              <div className={styles.promoIcon}>
                <HelpCircle size={20} />
              </div>
              <div className={styles.promoText}>
                <span className={styles.promoTitle}>MATTRESS QUIZ</span>
                <span className={styles.promoSubtitle}>find your perfect match</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

