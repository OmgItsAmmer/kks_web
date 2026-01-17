import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import styles from './Navigation.module.css';

interface NavigationProps {
  isOpen?: boolean;
  isMobileMenuOpen?: boolean;
  onClose?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ isOpen = true, isMobileMenuOpen = false, onClose }) => {
  const navigate = useNavigate();
  
  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const categories = useMemo(() => categoriesData || [], [categoriesData]);

  // Create category links similar to Footer
  const categoryLinks = useMemo(() => {
    const links = [
      { label: 'All Categories', href: '/?category=all' }
    ];
    
    // Add up to 6 categories
    const limitedCategories = categories.slice(0, 6);
    limitedCategories.forEach((category) => {
      links.push({
        label: category.category_name,
        href: `/?category=${category.category_id}`
      });
    });
    
    return links;
  }, [categories]);

  // Handle category link click - scroll to section if on home page
  const handleCategoryClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const isOnHomePage = window.location.pathname === '/';
    if (isOnHomePage) {
      e.preventDefault();
      navigate(href);
      // Scroll will be handled by Home component
    }
  };

  // Handle Sales & Clearance click - scroll to collections section
  const handleSalesClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const isOnHomePage = window.location.pathname === '/';
    
    if (isOnHomePage) {
      // Scroll to hero section (collections section)
      const heroSection = document.getElementById('collections-section');
      if (heroSection) {
        const yOffset = -80; // Offset for header
        const y = heroSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else {
      // Navigate to home and scroll to collections
      navigate('/');
      setTimeout(() => {
        const heroSection = document.getElementById('collections-section');
        if (heroSection) {
          const yOffset = -80;
          const y = heroSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={onClose}></div>
      )}
      
      <nav className={`${styles.navigation} ${isOpen ? styles.open : ''} ${isMobileMenuOpen ? styles.mobileOpen : ''}`}>
        <div className="container">
          <div className={styles.navContent}>
          {/* Main Nav Items - Categories */}
          <ul className={styles.navList}>
            {categoriesLoading ? (
              <li className={styles.navItem}>
                <span className={styles.navLink} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Loading...
                </span>
              </li>
            ) : (
              categoryLinks.map((item) => (
                <li 
                  key={item.label} 
                  className={styles.navItem}
                >
                  <Link 
                    to={item.href} 
                    className={styles.navLink}
                    onClick={(e) => {
                      handleCategoryClick(e, item.href);
                      if (isMobileMenuOpen && onClose) {
                        onClose();
                      }
                    }}
                  >
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>

          {/* Promo Items */}
          <div className={styles.promoItems}>
            {/* Sales & Clearance */}
            <a 
              href="#" 
              onClick={(e) => {
                handleSalesClick(e);
                if (isMobileMenuOpen && onClose) {
                  onClose();
                }
              }}
              className={styles.promoItem}
            >
              <div className={styles.promoIcon}>
                <Sparkles size={20} />
              </div>
              <div className={styles.promoText}>
                <span className={styles.promoTitle}>COLLECTIONS</span>
                <span className={styles.promoSubtitle}>Hurry! GET READY-MADE PACKAGES</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </nav>
    </>
  );
};

export default Navigation;

