import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Facebook } from 'lucide-react';
import styles from './TopBar.module.css';
import InfoPopup from '../InfoPopup';

const contactInfo = {
  title: 'Contact Us - KKS',
  content: {
    description: 'KKS is your trusted local karyana (grocery) store, offering a wide range of quality products for your everyday needs.',
    contact: {
      phone: '03022500085',
      email: 'hello@kksonline.com.pk',
      address: 'Pakistan'
    },
    details: [
      'Premium quality grocery items and household essentials',
      'Fresh produce and daily necessities',
      'Competitive pricing with regular discounts',
      'Customer-friendly service and support'
    ]
  }
};

const TopBar: React.FC = () => {
  const [showContactPopup, setShowContactPopup] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleReviewsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/') {
      const element = document.getElementById('testimonials-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/?scroll=testimonials');
    }
  };

  return (
    <>
      <div className={styles.topBar}>
        <div className="container">
          <div className={styles.content}>
            {/* Left Links */}
            <nav className={styles.navLinks}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setShowContactPopup(true); }} 
                className={styles.link}
              >
                Contact
              </a>
              <a 
                href="#" 
                onClick={handleReviewsClick} 
                className={styles.link}
              >
                Reviews
              </a>
            </nav>

            {/* Right Section */}
            <div className={styles.rightSection}>
              {/* Contact Info */}
              <div className={styles.contactInfo}>
                <a href="mailto:ammersaeed21@gmail.com" className={styles.link} aria-label="Email Us">
                  <Mail size={14} />
                </a>
              </div>

              {/* Social Links */}
              <div className={styles.socialLinks}>
                <a 
                  href="https://web.facebook.com/profile.php?id=100089805542031#" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.socialLink} 
                  aria-label="Facebook"
                >
                  <Facebook size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <InfoPopup 
        isOpen={showContactPopup} 
        onClose={() => setShowContactPopup(false)} 
        title={contactInfo.title} 
        content={contactInfo.content} 
      />
    </>
  );
};

export default TopBar;
