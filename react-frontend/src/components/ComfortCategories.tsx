import React from 'react';
import { Link } from 'react-router-dom';
import { Snowflake, Cloud, Dumbbell, Gauge, Users, Shield } from 'lucide-react';
import styles from './ComfortCategories.module.css';

interface ComfortCategory {
  icon: React.ReactNode;
  title: string;
  itemCount: number;
  href: string;
  gradient: string;
}

const categories: ComfortCategory[] = [
  {
    icon: <Snowflake size={32} />,
    title: 'Most Cooling',
    itemCount: 10,
    href: '/mattresses?features=cooling',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  },
  {
    icon: <Cloud size={32} />,
    title: 'Soft Comfort',
    itemCount: 8,
    href: '/mattresses?firmness=soft',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
  },
  {
    icon: <Dumbbell size={32} />,
    title: 'Firm Comfort',
    itemCount: 7,
    href: '/mattresses?firmness=firm',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  {
    icon: <Gauge size={32} />,
    title: 'Medium Comfort',
    itemCount: 16,
    href: '/mattresses?firmness=medium',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  },
  {
    icon: <Users size={32} />,
    title: 'Heavy People',
    itemCount: 12,
    href: '/mattresses?features=heavy-duty',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  },
  {
    icon: <Shield size={32} />,
    title: 'Most Support',
    itemCount: 14,
    href: '/mattresses?features=extra-support',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  },
];

const ComfortCategories: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Shop by Comfort & Support</h2>
          <p className={styles.subtitle}>
            Because the right comfort means better sleep, brighter mornings, and healthier days.
          </p>
        </div>

        {/* Categories Grid */}
        <div className={styles.grid}>
          {categories.map((category, index) => (
            <Link
              key={index}
              to={category.href}
              className={styles.card}
              style={{ '--card-gradient': category.gradient } as React.CSSProperties}
            >
              <div className={styles.cardInner}>
                <div className={styles.iconWrapper}>
                  {category.icon}
                </div>
                <h3 className={styles.cardTitle}>{category.title}</h3>
                <p className={styles.cardCount}>{category.itemCount} Items</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComfortCategories;

