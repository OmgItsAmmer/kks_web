import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ArrowRight, Sparkles } from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './GuidesSection.module.css';

interface Guide {
  id: string;
  title: string;
  excerpt: string;
  readTime: string;
  href: string;
  isFeatured?: boolean;
}

const guides: Guide[] = [
  {
    id: '1',
    title: '🛏 Mattress Buying Guide',
    excerpt: 'Choosing the right mattress is one of the most important decisions for your comfort and health. A mattress affects your sleep quality, spinal alignment, and overall well-being.',
    readTime: '5 minutes',
    href: '/guides/mattress',
    isFeatured: true,
  },
  {
    id: '2',
    title: '🛋 Sofa Buying Guide',
    excerpt: 'A sofa isn\'t just a piece of furniture — it\'s where you relax, entertain guests, and sometimes even nap. Choosing the right sofa means balancing comfort, style, and durability.',
    readTime: '5 minutes',
    href: '/guides/sofa',
  },
  {
    id: '3',
    title: '🛏 Bed Buying Guide',
    excerpt: 'Your bed is the foundation of your bedroom. The right bed frame not only supports your mattress but also adds style and storage.',
    readTime: '5 minutes',
    href: '/guides/bed',
  },
  {
    id: '4',
    title: '🛌 Pillow Buying Guide',
    excerpt: 'A pillow is just as important as a mattress when it comes to sleep quality. The right pillow supports your head, neck, and spine alignment.',
    readTime: '5 minutes',
    href: '/guides/pillow',
  },
  {
    id: '5',
    title: '🛏 Bunk Bed Buying Guide',
    excerpt: 'Bunk beds are a smart way to save space and make bedrooms fun for kids. They\'re also practical for guest rooms or shared spaces.',
    readTime: '5 minutes',
    href: '/guides/bunkbed',
  },
  {
    id: '6',
    title: '🛏 Mattress Topper Buying Guide',
    excerpt: 'A mattress topper is a quick and affordable way to improve your bed without buying a new mattress.',
    readTime: '5 minutes',
    href: '/guides/topper',
  },
];

const GuidesSection: React.FC = () => {
  const featuredGuide = guides.find(g => g.isFeatured);
  const otherGuides = guides.filter(g => !g.isFeatured);

  return (
    <section className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Ideas & Guides</h2>
          <p className={styles.subtitle}>
            Expert advice, comprehensive buying guides, and inspirational ideas to help you create the perfect sleep sanctuary
          </p>
        </div>

        <div className={styles.content}>
          {/* Featured Guide */}
          {featuredGuide && (
            <Link to={featuredGuide.href} className={styles.featuredGuide}>
              <div className={styles.featuredImageWrapper}>
                <img src={logo} alt={featuredGuide.title} className={styles.featuredImage} />
                <div className={styles.expertBadge}>
                  <Sparkles size={14} />
                  <span>Expert Advice</span>
                </div>
              </div>
              <div className={styles.featuredContent}>
                <div className={styles.featuredInfo}>
                  <h3 className={styles.featuredTitle}>{featuredGuide.title}</h3>
                  <p className={styles.featuredExcerpt}>{featuredGuide.excerpt}</p>
                </div>
                <div className={styles.featuredFooter}>
                  <div className={styles.readTime}>
                    <Clock size={14} />
                    <span>{featuredGuide.readTime}</span>
                  </div>
                  <span className={styles.readMore}>
                    Read Guide
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Other Guides Grid */}
          <div className={styles.guidesGrid}>
            {otherGuides.map((guide) => (
              <Link key={guide.id} to={guide.href} className={styles.guideCard}>
                <div className={styles.guideImageWrapper}>
                  <img src={logo} alt={guide.title} className={styles.guideImage} />
                  <div className={styles.guideBadge}>
                    <BookOpen size={12} />
                    <span>Expert Advice</span>
                  </div>
                </div>
                <div className={styles.guideContent}>
                  <div className={styles.guideInfo}>
                    <h4 className={styles.guideTitle}>{guide.title}</h4>
                    <p className={styles.guideExcerpt}>{guide.excerpt}</p>
                  </div>
                  <div className={styles.guideFooter}>
                    <div className={styles.guideReadTime}>
                      <Clock size={12} />
                      <span>{guide.readTime}</span>
                    </div>
                    <span className={styles.guideReadMore}>
                      Read More
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Explore All Button */}
        <div className={styles.exploreWrapper}>
          <Link to="/guides" className={styles.exploreButton}>
            <BookOpen size={18} />
            Explore All Guides
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GuidesSection;

