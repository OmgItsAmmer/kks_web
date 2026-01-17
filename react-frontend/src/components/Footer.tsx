import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Instagram, 
  Truck,
  Shield,
  CreditCard,
  Headphones,
  Globe,
  Linkedin
} from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import { useCategories } from '../hooks/useCategories';
import InfoPopup from './InfoPopup';
import styles from './Footer.module.css';

// WhatsApp Icon Component
const WhatsAppIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const kksCompanyLinks = [
  { label: 'Contact Us', key: 'contact' },
  { label: 'Customer Reviews', key: 'reviews' },
  { label: 'Delivery Information', key: 'delivery' },
  { label: 'Returns & Exchanges', key: 'returns' },
];

const omgxCompanyLinks = [
  { label: 'About Us', key: 'about' },
  { label: 'Press & Media', key: 'press' },
];

// KKS Information
const kksInfo: Record<string, { title: string; content: any }> = {
  contact: {
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
  },
  reviews: {
    title: 'Customer Reviews - KKS',
    content: {
      description: 'We value feedback from our customers and continuously work to improve our services.',
      details: [
        'Read authentic reviews from our satisfied customers',
        'Share your shopping experience with us',
        'Help us serve you better through your feedback',
        'Join our growing community of happy customers'
      ]
    }
  },
  delivery: {
    title: 'Delivery Information - KKS',
    content: {
      description: 'We offer convenient delivery options to bring your grocery items right to your doorstep.',
      details: [
        'Free delivery on orders over Rs. 5000',
        'Same-day delivery available for select areas',
        'Standard delivery: 2-3 business days',
        'Track your order in real-time',
        'Multiple delivery time slots available',
        'Cash on delivery option available'
      ]
    }
  },
  returns: {
    title: 'Returns & Exchanges - KKS',
    content: {
      description: 'We ensure your satisfaction with our hassle-free return and exchange policy.',
      details: [
        '7-day return policy on unopened items',
        'Quality guarantee on all products',
        'Easy exchange for damaged or defective items',
        'Full refund or store credit options',
        'Contact customer service for assistance'
      ]
    }
  }
};

// OMGx Information
const omgxInfo: Record<string, { title: string; content: any }> = {
  about: {
    title: 'About Us - OMGx',
    content: {
      description: 'OMGx is a leading software development company specializing in creating modern web applications and e-commerce solutions.',
      contact: {
        phone: '03236508184'
      },
      details: [
        'Expert web development and design services',
        'E-commerce platform development',
        'Custom software solutions',
        'Mobile application development',
        'Owned and operated by Ammer Saeed',
        'Dedicated to delivering innovative technology solutions'
      ]
    }
  },
  press: {
    title: 'Press & Media - OMGx',
    content: {
      description: 'Stay updated with our latest projects, achievements, and company news.',
      details: [
        'Follow us for updates on our latest developments',
        'Press releases and company announcements',
        'Case studies and project showcases',
        'Media inquiries welcome'
      ]
    }
  }
};

// Legal Information
const legalInfo: Record<string, { title: string; content: any }> = {
  privacy: {
    title: 'Privacy Policy',
    content: {
      description: 'At KKS Online, we are committed to protecting your privacy and ensuring the security of your personal information.',
      details: [
        'We collect personal information only when necessary for order processing and customer service',
        'Your payment information is securely processed and never stored on our servers',
        'We use cookies to enhance your browsing experience and analyze website traffic',
        'Your personal data will not be shared with third parties without your explicit consent',
        'You have the right to access, update, or delete your personal information at any time',
        'We implement industry-standard security measures to protect your data',
        'Changes to this privacy policy will be communicated through our website',
        'For questions about your privacy, please contact us at hello@kksonline.com.pk'
      ]
    }
  },
  terms: {
    title: 'Terms of Service',
    content: {
      description: 'By using KKS Online, you agree to the following terms and conditions of service.',
      details: [
        'All products are subject to availability and may be discontinued without notice',
        'Prices are displayed in PKR and are subject to change',
        'Order acceptance is subject to payment verification and product availability',
        'Delivery times are estimates and may vary based on location and circumstances',
        'We reserve the right to refuse service or cancel orders at our discretion',
        'Customers are responsible for providing accurate delivery information',
        'Products must be returned in original condition with packaging intact',
        'KKS Online reserves the right to modify these terms at any time',
        'Disputes will be resolved according to Pakistani law',
        'For inquiries about our terms, contact us at hello@kksonline.com.pk'
      ]
    }
  },
  cookies: {
    title: 'Cookie Policy',
    content: {
      description: 'KKS Online uses cookies to improve your shopping experience and provide personalized services.',
      details: [
        'Essential cookies are required for the website to function properly',
        'Analytics cookies help us understand how visitors interact with our website',
        'Preference cookies remember your settings and choices',
        'Marketing cookies are used to deliver relevant advertisements',
        'You can manage cookie preferences through your browser settings',
        'Disabling certain cookies may affect website functionality',
        'Third-party cookies may be used for payment processing and analytics',
        'We respect Do Not Track signals from your browser',
        'Cookies do not contain personally identifiable information',
        'For more information, contact us at hello@kksonline.com.pk'
      ]
    }
  }
};

const features = [
  { icon: <Truck size={24} />, title: 'Free Delivery', subtitle: 'On orders over £50' },
  { icon: <Shield size={24} />, title: '100% Secure', subtitle: 'Safe & secure payments' },
  { icon: <CreditCard size={24} />, title: 'Flexible Payment', subtitle: '0% interest available' },
  { icon: <Headphones size={24} />, title: '24/7 Support', subtitle: 'Always here to help' },
];

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const [popupInfo, setPopupInfo] = useState<{ title: string; content: any } | null>(null);
  
  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const categories = useMemo(() => categoriesData || [], [categoriesData]);

  // Get first 6 categories plus "All" (7 total)
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

  // Handle WhatsApp chat
  const handleLiveChat = () => {
    const phoneNumber = '+923236508184';
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`;
    window.open(whatsappUrl, '_blank');
  };

  // Handle category link click - scroll to section if on home page
  const handleCategoryClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const isOnHomePage = window.location.pathname === '/';
    if (isOnHomePage) {
      e.preventDefault();
      navigate(href);
      // Scroll will be handled by Home component
    }
  };

  // Handle KKS link click
  const handleKksLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, key: string) => {
    e.preventDefault();
    const info = kksInfo[key];
    if (info) {
      setPopupInfo(info);
    }
  };

  // Handle OMGx link click
  const handleOmgxLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, key: string) => {
    e.preventDefault();
    const info = omgxInfo[key];
    if (info) {
      setPopupInfo(info);
    }
  };

  // Handle legal link click (Privacy, Terms, Cookies)
  const handleLegalLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, key: string) => {
    e.preventDefault();
    const info = legalInfo[key];
    if (info) {
      setPopupInfo(info);
    }
  };

  const closePopup = () => {
    setPopupInfo(null);
  };

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
                <button 
                  className={styles.liveChatButton}
                  onClick={handleLiveChat}
                  type="button"
                >
                  <WhatsAppIcon size={18} />
                  Live Chat Support
                </button>
                
                <div className={styles.contactItem}>
                  <Phone size={16} />
                  <span>03022500085</span>
                </div>
                
                <div className={styles.contactItem}>
                  <Mail size={16} />
                  <span>hello@kksonline.com.pk</span>
                </div>
                
                <div className={styles.contactItem}>
                  <MapPin size={16} />
                  <span>Pakistan</span>
                </div>
              </div>
            </div>

            {/* Categories Column */}
            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>Categories</h4>
              {categoriesLoading ? (
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Loading...</p>
              ) : (
                <ul className={styles.linksList}>
                  {categoryLinks.map((link) => (
                    <li key={link.label}>
                      <Link 
                        to={link.href} 
                        className={styles.link}
                        onClick={(e) => handleCategoryClick(e, link.href)}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* KKS Company Column */}
            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>KKS</h4>
              <ul className={styles.linksList}>
                {kksCompanyLinks.map((link) => (
                  <li key={link.label}>
                    <a 
                      href="#" 
                      className={styles.link}
                      onClick={(e) => handleKksLinkClick(e, link.key)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              <h5 className={styles.socialTitle}>Follow Us</h5>
              <div className={styles.socialLinks}>
                <a href="#" className={styles.socialLink} aria-label="Facebook">
                  <Facebook size={18} />
                </a>
                <a href="#" className={styles.socialLink} aria-label="Instagram">
                  <Instagram size={18} />
                </a>
              </div>
            </div>

            {/* Developer Company Column */}
            <div className={styles.linksColumn}>
              <h4 className={styles.columnTitle}>OMGx</h4>
              <ul className={styles.linksList}>
                {omgxCompanyLinks.map((link) => (
                  <li key={link.label}>
                    <a 
                      href="#" 
                      className={styles.link}
                      onClick={(e) => handleOmgxLinkClick(e, link.key)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              <h5 className={styles.socialTitle}>Follow Us</h5>
              <div className={styles.socialLinks}>
                <a href="#" className={styles.socialLink} aria-label="Website">
                  <Globe size={18} />
                </a>
                <a href="#" className={styles.socialLink} aria-label="LinkedIn">
                  <Linkedin size={18} />
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
              <a 
                href="#" 
                className={styles.bottomLink}
                onClick={(e) => handleLegalLinkClick(e, 'privacy')}
              >
                Privacy Policy
              </a>
              <a 
                href="#" 
                className={styles.bottomLink}
                onClick={(e) => handleLegalLinkClick(e, 'terms')}
              >
                Terms of Service
              </a>
              <a 
                href="#" 
                className={styles.bottomLink}
                onClick={(e) => handleLegalLinkClick(e, 'cookies')}
              >
                Cookie Policy
              </a>
            </div>
            <div className={styles.poweredBy}>
              <span>Powered by</span>
              <span className={styles.poweredByBrand}>OMGx</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Popup */}
      {popupInfo && (
        <InfoPopup
          isOpen={!!popupInfo}
          onClose={closePopup}
          title={popupInfo.title}
          content={popupInfo.content}
        />
      )}
    </footer>
  );
};

export default Footer;
