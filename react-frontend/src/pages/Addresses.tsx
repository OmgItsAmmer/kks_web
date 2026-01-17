import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { addressService } from '../services/address.service';
import { useProtectedAction } from '../hooks/useProtectedAction';
import { useSnackbar } from '../contexts/SnackbarContext';
import Loader from '../components/Loader';
import type { Address } from '../types/address';
import styles from './Addresses.module.css';

const Addresses: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const { executeProtectedAction } = useProtectedAction();
  const { showError, showSuccess } = useSnackbar();

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    await executeProtectedAction(async () => {
      try {
        const response = await addressService.getAddresses();
        setAddresses(response.data);
      } catch (error) {
        console.error('Error loading addresses:', error);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDelete = async (addressId: number) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    await executeProtectedAction(async () => {
      try {
        await addressService.deleteAddress(addressId);
        setAddresses((prev) => prev.filter((addr) => addr.address_id !== addressId));
        showSuccess('Address deleted successfully');
      } catch (error: any) {
        console.error('Error deleting address:', error);
        showError(error.message || 'Failed to delete address');
      }
    });
  };

  return (
    <div className="container">
      <div className={styles.addressesPage}>
        <div className={styles.header}>
          <div>
            <h1>My Addresses</h1>
            <p className={styles.subtitle}>Manage your delivery addresses</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className={styles.addButton}
          >
            <Plus size={20} />
            Add New Address
          </button>
        </div>

        {loading ? (
          <Loader message="Loading addresses..." variant="inline" />
        ) : addresses.length > 0 ? (
          <div className={styles.addressesList}>
            {addresses.map((address) => (
              <div key={address.address_id} className={styles.addressCard}>
                <div className={styles.addressHeader}>
                  <div className={styles.addressIcon}>
                    <MapPin size={24} />
                  </div>
                  <div className={styles.addressActions}>
                    <button
                      onClick={() => handleDelete(address.address_id)}
                      className={styles.deleteButton}
                      title="Delete address"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className={styles.addressContent}>
                  <h3 className={styles.addressName}>{address.full_name}</h3>
                  <p className={styles.addressText}>{address.shipping_address}</p>
                  <p className={styles.addressText}>
                    {address.city}, {address.postal_code}
                  </p>
                  <p className={styles.addressText}>{address.country}</p>
                  <p className={styles.addressPhone}>{address.phone_number}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <MapPin size={64} className={styles.emptyIcon} />
            <h2>No Addresses Saved</h2>
            <p>Add a delivery address to make checkout faster</p>
            <button
              onClick={() => setShowAddForm(true)}
              className={styles.addButtonLarge}
            >
              <Plus size={20} />
              Add Your First Address
            </button>
          </div>
        )}

        {/* Add Address Form Modal */}
        {showAddForm && (
          <AddAddressModal
            onClose={() => setShowAddForm(false)}
            onSuccess={() => {
              setShowAddForm(false);
              loadAddresses();
            }}
          />
        )}
      </div>
    </div>
  );
};

interface AddAddressModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddAddressModal: React.FC<AddAddressModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    shippingAddress: '',
    city: '',
    postalCode: '',
    phoneNumber: '',
    country: 'Pakistan',
  });
  const [submitting, setSubmitting] = useState(false);
  const { executeProtectedAction } = useProtectedAction();
  const { showError, showSuccess } = useSnackbar();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Client-side validation
    const phoneNumber = formData.phoneNumber.trim();
    if (!/^03[0-9]{9}$/.test(phoneNumber)) {
      showError('Phone number must be in format: 03 followed by 9 digits (e.g., 03123456789)');
      setSubmitting(false);
      return;
    }

    try {
      await executeProtectedAction(async () => {
        // Prepare data - omit postalCode if empty (validation requires min 3 chars if provided)
        const addressData: any = {
          fullName: formData.fullName.trim(),
          shippingAddress: formData.shippingAddress.trim(),
          city: formData.city.trim(),
          phoneNumber: phoneNumber,
          country: formData.country.trim() || 'Pakistan',
        };

        // Only include postalCode if it has at least 3 characters
        if (formData.postalCode.trim().length >= 3) {
          addressData.postalCode = formData.postalCode.trim();
        }

        // Debug: Log the data being sent
        console.log('Creating address with data:', addressData);

        const response = await addressService.createAddress(addressData);
        if (response) {
          showSuccess('Address added successfully');
          onSuccess();
        }
      });
    } catch (error: any) {
      console.error('Error adding address:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode,
        errors: error.errors,
        response: error.response,
        stack: error.stack,
      });
      
      // Show detailed error message if available
      let errorMessage = 'Failed to add address. Please check all fields and try again.';
      
      // Handle validation errors (422 status)
      if (error.status === 422 || error.statusCode === 422) {
        if (error.errors && typeof error.errors === 'object') {
          const errorMessages = Object.values(error.errors).flat();
          errorMessage = errorMessages.join(', ') || errorMessage;
        } else if (error.response?.errors) {
          const errorMessages = Object.values(error.response.errors).flat();
          errorMessage = errorMessages.join(', ') || errorMessage;
        } else if (error.response?.error) {
          errorMessage = error.response.error;
        }
      } else if (error.response?.error) {
        errorMessage = error.response.error;
      } else if (error.response?.message) {
        errorMessage = error.response.message;
      } else if (error.message && error.message !== 'Failed to create address') {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Add New Address</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">Full Name *</label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="phoneNumber">Phone Number *</label>
            <input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
              placeholder="03XXXXXXXXX (10 digits)"
              pattern="03[0-9]{9}"
              className={styles.input}
            />
            <small style={{ color: '#666', fontSize: '0.875rem' }}>
              Format: 03 followed by 9 digits (e.g., 03123456789)
            </small>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="shippingAddress">Address *</label>
            <textarea
              id="shippingAddress"
              value={formData.shippingAddress}
              onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
              required
              rows={3}
              className={styles.textarea}
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="city">City *</label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="postalCode">Postal Code</label>
              <input
                id="postalCode"
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Optional (min 3 characters if provided)"
                className={styles.input}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="country">Country</label>
            <input
              id="country"
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className={styles.input}
            />
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={styles.submitButton}
            >
              {submitting ? 'Adding...' : 'Add Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Addresses;
