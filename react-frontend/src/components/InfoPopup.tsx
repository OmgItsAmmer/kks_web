import React from 'react';
import { X } from 'lucide-react';
import styles from './InfoPopup.module.css';

interface InfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: {
    description?: string;
    details?: string[];
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
    };
    social?: {
      facebook?: string;
      instagram?: string;
      website?: string;
      linkedin?: string;
    };
  };
}

const InfoPopup: React.FC<InfoPopupProps> = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        
        <div className={styles.content}>
          {content.description && (
            <p className={styles.description}>{content.description}</p>
          )}
          
          {content.details && content.details.length > 0 && (
            <div className={styles.details}>
              <ul>
                {content.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
          
          {content.contact && (
            <div className={styles.contact}>
              <h3>Contact Information</h3>
              {content.contact.phone && (
                <p><strong>Phone:</strong> {content.contact.phone}</p>
              )}
              {content.contact.email && (
                <p><strong>Email:</strong> {content.contact.email}</p>
              )}
              {content.contact.address && (
                <p><strong>Address:</strong> {content.contact.address}</p>
              )}
            </div>
          )}
          
          {content.social && (
            <div className={styles.social}>
              <h3>Follow Us</h3>
              <div className={styles.socialLinks}>
                {content.social.facebook && (
                  <a href={content.social.facebook} target="_blank" rel="noopener noreferrer">
                    Facebook
                  </a>
                )}
                {content.social.instagram && (
                  <a href={content.social.instagram} target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                )}
                {content.social.website && (
                  <a href={content.social.website} target="_blank" rel="noopener noreferrer">
                    Website
                  </a>
                )}
                {content.social.linkedin && (
                  <a href={content.social.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoPopup;
