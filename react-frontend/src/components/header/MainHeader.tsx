import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Heart, ShoppingCart, Truck, Menu, X, LogOut, Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import LoginModal from '../auth/LoginModal';
import { productService } from '../../services/product.service';
import { cartService } from '../../services/cart.service';
import logo from '../../assets/images/logo.png';
import styles from './MainHeader.module.css';

interface SearchProduct {
  product_id: number;
  name: string;

  mainImage?: string | null;
}

interface MainHeaderProps {
  onMobileMenuToggle?: (isOpen: boolean) => void;
  isMobileMenuOpen?: boolean;
}

const MainHeader: React.FC<MainHeaderProps> = ({ onMobileMenuToggle, isMobileMenuOpen = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { user, isAuthenticated, showLoginModal, logout } = useAuth();
  const { wishlistCount } = useWishlist();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      const clickedOutsideSearch = 
        (!searchRef.current || !searchRef.current.contains(event.target as Node)) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(event.target as Node));
      
      if (clickedOutsideSearch) {
        setShowSearchDropdown(false);
      }
    };

    if (showUserMenu || showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showSearchDropdown]);

  // Load cart count
  useEffect(() => {
    if (isAuthenticated) {
      loadCartCount();
    } else {
      setCartCount(0);
    }
  }, [isAuthenticated]);

  // Listen for cart update events
  useEffect(() => {
    const handleCartUpdate = () => {
      if (isAuthenticated) {
        loadCartCount();
      } else {
        setCartCount(0);
      }
    };
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, [isAuthenticated]);

  // Search debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await productService.getProducts({
            q: searchQuery,
            pageSize: 5,
          });
          setSearchResults(response.data || []);
          setShowSearchDropdown(true);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadCartCount = async () => {
    try {
      const count = await cartService.getCartCount();
      setCartCount(count);
    } catch (error) {
      console.error('Error loading cart count:', error);
    }
  };

  const handleLoginClick = () => {
    showLoginModal();
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchDropdown(false);
    }
  };

  const handleProductClick = (productId: number) => {
    navigate(`/product/${productId}`);
    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  return (
    <>
      <div className={styles.mainHeader}>
        <div className="container">
          <div className={styles.content}>
            {/* Mobile Menu Toggle */}
            <button 
              className={styles.mobileMenuToggle}
              onClick={() => onMobileMenuToggle?.(!isMobileMenuOpen)}
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
            <div className={styles.searchContainer} ref={searchRef}>
              <div className={styles.searchWrapper}>
                <form onSubmit={handleSearchSubmit} className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Search for products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                    className={styles.searchInput}
                  />
                  <button type="submit" className={styles.searchButton} aria-label="Search">
                    <Search size={20} />
                  </button>
                </form>
                
                {/* Search Dropdown */}
                {showSearchDropdown && (
                  <div className={styles.searchDropdown}>
                    {isSearching ? (
                      <div className={styles.searchLoading}>Searching...</div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map((product) => (
                          <div
                            key={product.product_id}
                            className={styles.searchResultItem}
                            onClick={() => handleProductClick(product.product_id)}
                          >
                            {product.mainImage && (
                              <img
                                src={product.mainImage}
                                alt={product.name}
                                className={styles.searchResultImage}
                              />
                            )}
                            <div className={styles.searchResultInfo}>
                              <p className={styles.searchResultName}>{product.name}</p>
                              {/* <p className={styles.searchResultPrice}>Rs {parseFloat(product.sale_price).toLocaleString()}</p> */}
                            </div>
                          </div>
                        ))}
                        <Link 
                          to={`/search?q=${encodeURIComponent(searchQuery)}`} 
                          className={styles.searchViewAll}
                          onClick={() => setShowSearchDropdown(false)}
                        >
                          View all results
                        </Link>
                      </>
                    ) : (
                      <div className={styles.searchNoResults}>No products found</div>
                    )}
                  </div>
                )}
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
                {/* User/Login Button */}
                {isAuthenticated && user ? (
                  <div className={styles.userMenuWrapper} ref={userMenuRef}>
                    <button 
                      className={styles.actionItem}
                      onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                      <User size={22} />
                      <span className={styles.actionLabel}>
                        {user.firstName || 'Account'}
                      </span>
                    </button>
                    {showUserMenu && (
                      <div className={styles.userDropdown}>
                        <div className={styles.userDropdownHeader}>
                          <p className={styles.userName}>{user.firstName} {user.lastName}</p>
                          <p className={styles.userEmail}>{user.email}</p>
                        </div>
                        <Link 
                          to="/orders" 
                          className={styles.dropdownItem}
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Package size={18} />
                          <span>All Orders</span>
                        </Link>
                        {/* <Link 
                          to="/addresses" 
                          className={styles.dropdownItem}
                          onClick={() => setShowUserMenu(false)}
                        >
                          <MapPin size={18} />
                          <span>Addresses</span>
                        </Link> */}
                        <button 
                          className={styles.logoutButton}
                          onClick={handleLogout}
                        >
                          <LogOut size={18} />
                          <span>Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={handleLoginClick} 
                    className={styles.actionItem}
                  >
                    <User size={22} />
                    <span className={styles.actionLabel}>Login</span>
                  </button>
                )}

                <Link to="/wishlist" className={styles.actionItem}>
                  <div className={styles.iconWrapper}>
                    <Heart size={22} />
                    {wishlistCount > 0 && <span className={styles.badge}>{wishlistCount}</span>}
                  </div>
                  <span className={styles.actionLabel}>Wishlist</span>
                </Link>

                <Link to="/cart" className={styles.actionItem}>
                  <div className={styles.iconWrapper}>
                    <ShoppingCart size={22} />
                    {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
                  </div>
                  <span className={styles.actionLabel}>Cart</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Search */}
          <div className={styles.mobileSearch} ref={mobileSearchRef}>
            <form onSubmit={handleSearchSubmit} className={styles.mobileSearchWrapper}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                className={styles.mobileSearchInput}
              />
              <button type="submit" className={styles.mobileSearchButton} aria-label="Search">
                <Search size={20} />
              </button>
            </form>

            {/* Mobile Search Dropdown */}
            {showSearchDropdown && (
              <div className={styles.searchDropdown}>
                {isSearching ? (
                  <div className={styles.searchLoading}>Searching...</div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map((product) => (
                      <div
                        key={product.product_id}
                        className={styles.searchResultItem}
                        onClick={() => handleProductClick(product.product_id)}
                      >
                        {product.mainImage && (
                          <img
                            src={product.mainImage}
                            alt={product.name}
                            className={styles.searchResultImage}
                          />
                        )}
                        <div className={styles.searchResultInfo}>
                          <p className={styles.searchResultName}>{product.name}</p>
                          {/* <p className={styles.searchResultPrice}>Rs {parseFloat(product.sale_price).toLocaleString()}</p> */}
                        </div>
                      </div>
                    ))}
                    <Link 
                      to={`/search?q=${encodeURIComponent(searchQuery)}`} 
                      className={styles.searchViewAll}
                      onClick={() => setShowSearchDropdown(false)}
                    >
                      View all results
                    </Link>
                  </>
                ) : (
                  <div className={styles.searchNoResults}>No products found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal />
    </>
  );
};

export default MainHeader;

