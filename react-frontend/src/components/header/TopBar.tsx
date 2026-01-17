import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import styles from './TopBar.module.css';

const TopBar: React.FC = () => {
  return (
    <div className={styles.topBar}>
      <div className="container">
        <div className={styles.content}>
          {/* Left Links */}
          <nav className={styles.navLinks}>
            <Link to="/contact" className={styles.link}>Contact</Link>
            <Link to="/reviews" className={styles.link}>Reviews</Link>
            <Link to="/support" className={styles.link}>Support</Link>
          </nav>

          {/* Right Section */}
          <div className={styles.rightSection}>
            {/* Contact Info */}
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Mail size={14} />
                <span>hello@kksonline.co.uk</span>
              </div>
            </div>

            {/* Social Links */}
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink} aria-label="Facebook">
                <Facebook size={14} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="Twitter">
                <Twitter size={14} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="Instagram">
                <Instagram size={14} />
              </a>
              <a href="#" className={styles.socialLink} aria-label="YouTube">
                <Youtube size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;

