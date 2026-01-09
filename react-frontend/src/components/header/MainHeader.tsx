import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Heart, ShoppingCart, ChevronDown, Truck, Menu, X } from 'lucide-react';
import logo from '../../assets/images/kks_new_logo_dark.png';
import styles from './MainHeader.module.css';

const MainHeader: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className={styles.mainHeader}>
      <div className="container">
        <div className={styles.content}>
          {/* Mobile Menu Toggle */}
          <button 
            className={styles.mobileMenuToggle}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link to="/" className={styles.logo}>
            <img src={logo} alt="KKS Online" className={styles.logoImage} />
            <span className={styles.logoText}>KKS Online</span>
          </Link>

          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <div className={styles.searchWrapper}>
              <button className={styles.categoryDropdown}>
                <span>All Category</span>
                <ChevronDown size={16} />
              </button>
              <div className={styles.searchInputWrapper}>
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                <button className={styles.searchButton} aria-label="Search">
                  <Search size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className={styles.actions}>
            {/* Free Delivery Badge */}
            <div className={styles.deliveryBadge}>
              <Truck size={24} className={styles.deliveryIcon} />
              <div className={styles.deliveryText}>
                <span className={styles.deliveryTitle}>Free delivery</span>
                <span className={styles.deliverySubtitle}>Most locations</span>
              </div>
            </div>

            {/* User Actions */}
            <div className={styles.userActions}>
              <Link to="/login" className={styles.actionItem}>
                <User size={22} />
                <span className={styles.actionLabel}>Login</span>
              </Link>

              <Link to="/wishlist" className={styles.actionItem}>
                <div className={styles.iconWrapper}>
                  <Heart size={22} />
                  <span className={styles.badge}>0</span>
                </div>
                <span className={styles.actionLabel}>Wishlist</span>
              </Link>

              <Link to="/cart" className={styles.actionItem}>
                <div className={styles.iconWrapper}>
                  <ShoppingCart size={22} />
                  <span className={styles.badge}>0</span>
                </div>
                <span className={styles.actionLabel}>Cart</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className={styles.mobileSearch}>
          <div className={styles.mobileSearchWrapper}>
            <input
              type="text"
              placeholder="Search products..."
              className={styles.mobileSearchInput}
            />
            <button className={styles.mobileSearchButton} aria-label="Search">
              <Search size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainHeader;

