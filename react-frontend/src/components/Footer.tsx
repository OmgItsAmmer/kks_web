import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  MessageCircle,
  Truck,
  Shield,
  CreditCard,
  Headphones
} from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './Footer.module.css';

const productLinks = [
  { label: 'Mattresses', href: '/mattresses' },
  { label: 'Sofas & Couches', href: '/sofas' },
  { label: 'Beds & Bed Frames', href: '/beds' },
  { label: 'Pillows & Bedding', href: '/pillows' },
  { label: 'Adjustable Bases', href: '/adjustable-bases' },
  { label: 'Beanbags', href: '/beanbags' },
  { label: 'Sale & Clearance', href: '/sale' },
];

const customerServiceLinks = [
  { label: 'Mattress Finder Quiz', href: '/mattress-finder' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Support Center', href: '/support' },
  { label: 'Customer Reviews', href: '/reviews' },
  { label: 'Size Guide', href: '/size-guide' },
  { label: 'Delivery Information', href: '/delivery' },
  { label: 'Returns & Exchanges', href: '/returns' },
];

const companyLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Careers', href: '/careers' },
  { label: 'Blog & Guides', href: '/guides' },
  { label: 'Press & Media', href: '/press' },
];

const features = [
  { icon: <Truck size={24} />, title: 'Free Delivery', subtitle: 'On orders over £50' },
  { icon: <Shield size={24} />, title: '100% Secure', subtitle: 'Safe & secure payments' },
  { icon: <CreditCard size={24} />, title: 'Flexible Payment', subtitle: '0% interest available' },
  { icon: <Headphones size={24} />, title: '24/7 Support', subtitle: 'Always here to help' },
];

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      {/* Main Footer */}
      <div className={styles.mainFooter}>
        <div className="container">
          <div className={styles.footerGrid}>
            {/* Brand Column */}
            <div className={styles.brandColumn}>
              <Link to="/" className={styles.logo}>
                <img src={logo} alt="KKS Online" className={styles.logoImage} />
                <span className={styles.logoText}>KKS Online</span>
              </Link>
              <p className={styles.brandDescription}>
                Your trusted partner for quality mattresses, sofas, and home furnishings. 
                We're committed to providing exceptional comfort and style for your home.
              </p>
              
              <div className={styles.contactInfo}>
                <button className={styles.liveChatButton}>
                  <MessageCircle size={18} />
                  Live Chat Support
                </button>
                
                <div className={styles.contactItem}>
                  <Phone size={16} />
                  <span>03301336323</span>
                </div>
                
                <div className={styles.contactItem}>
                  <Mail size={16} />
                  <span>hello@kksonline.co.uk</span>
                </div>
                
                <div className={styles.contactItem}>
                  <MapPin size={16} />
                  <span>United Kingdom</span>
                </div>
              </div>
            </div>

            {/* Products Column */}
            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>Products</h4>
              <ul className={styles.linksList}>
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Service Column */}
            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>Customer Service</h4>
              <ul className={styles.linksList}>
                {customerServiceLinks.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>Company</h4>
              <ul className={styles.linksList}>
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <h5 className={styles.socialTitle}>Follow Us</h5>
              <div className={styles.socialLinks}>
                <a href="#" className={styles.socialLink} aria-label="Facebook">
                  <Facebook size={18} />
                </a>
                <a href="#" className={styles.socialLink} aria-label="Twitter">
                  <Twitter size={18} />
                </a>
                <a href="#" className={styles.socialLink} aria-label="Instagram">
                  <Instagram size={18} />
                </a>
              </div>
            </div>
          </div>

          {/* Features Bar */}
          <div className={styles.featuresBar}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureItem}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <div className={styles.featureText}>
                  <span className={styles.featureTitle}>{feature.title}</span>
                  <span className={styles.featureSubtitle}>{feature.subtitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className={styles.bottomFooter}>
        <div className="container">
          <div className={styles.bottomContent}>
            <div className={styles.copyright}>
              <span>© {new Date().getFullYear()} KKS Online. All rights reserved.</span>
              <Link to="/privacy" className={styles.bottomLink}>Privacy Policy</Link>
              <Link to="/terms" className={styles.bottomLink}>Terms of Service</Link>
              <Link to="/cookies" className={styles.bottomLink}>Cookie Policy</Link>
            </div>
            <div className={styles.poweredBy}>
              <span>Powered by</span>
              <span className={styles.poweredByBrand}>KKS</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
