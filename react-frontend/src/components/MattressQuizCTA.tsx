import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import logo from '../assets/images/kks_new_logo_dark.png';
import styles from './MattressQuizCTA.module.css';

const MattressQuizCTA: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.wrapper}>
          {/* Image Side */}
          <div className={styles.imageSection}>
            <img src={logo} alt="Mattress Showroom" className={styles.image} />
          </div>

          {/* Content Side */}
          <div className={styles.content}>
            <div className={styles.badge}>
              <Sparkles size={16} />
              <span>Smart Mattress Finder</span>
            </div>
            
            <h2 className={styles.title}>
              Find Your Perfect Mattress in Minutes
            </h2>
            
            <p className={styles.description}>
              Our smart Mattress Finder makes shopping simple — answer a few quick questions 
              and instantly discover the best mattress for your comfort, support, and sleep style. 
              Whether you need an orthopaedic mattress, memory foam, or luxury hybrid, 
              we'll match you with the ideal choice — tailored just for you.
            </p>

            <Link to="/mattress-finder" className={styles.ctaButton}>
              Take the quiz
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MattressQuizCTA;

