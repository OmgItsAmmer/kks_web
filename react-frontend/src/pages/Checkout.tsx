import React, { useState } from 'react';
import { ShieldCheck, Truck, Award, Lock } from 'lucide-react';
import styles from './Checkout.module.css';

// Mock cart data - replace with actual cart state
const mockCartTotal = {
    subtotal: 97.50,
    delivery: 0,
    total: 97.50
};

const Checkout: React.FC = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postcode: '',
        country: 'United Kingdom'
    });

    const [deliveryOption, setDeliveryOption] = useState<'standard' | 'express'>('standard');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle checkout submission
        console.log('Checkout submitted:', { ...formData, deliveryOption });
        alert('Order placed successfully! (This is a demo)');
    };

    const deliveryFee = deliveryOption === 'express' ? 15.00 : 0;
    const finalTotal = mockCartTotal.subtotal + deliveryFee;

    return (
        <div className={styles.checkoutPage}>
            {/* Features Bar */}
            <div className={styles.featuresBar}>
                <div className="container">
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <Lock size={20} />
                            </div>
                            <div className={styles.featureText}>
                                <span className={styles.featureTitle}>Secure Checkout</span>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <Truck size={20} />
                            </div>
                            <div className={styles.featureText}>
                                <span className={styles.featureTitle}>Free Delivery</span>
                            </div>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>
                                <Award size={20} />
                            </div>
                            <div className={styles.featureText}>
                                <span className={styles.featureTitle}>1-Year Warranty</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container">
                <div className={styles.header}>
                    <h1 className={styles.title}>Checkout</h1>
                    <p className={styles.subtitle}>Complete your purchase securely</p>
                </div>

                <div className={styles.content}>
                    {/* Checkout Form */}
                    <div className={styles.formSection}>
                        <form onSubmit={handleSubmit}>
                            {/* Customer Information */}
                            <div className={styles.formGroup}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.sectionIcon}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        </svg>
                                    </div>
                                    <h2>Customer Information</h2>
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formField}>
                                        <label htmlFor="firstName">First Name *</label>
                                        <input
                                            type="text"
                                            id="firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            required
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.formField}>
                                        <label htmlFor="lastName">Last Name *</label>
                                        <input
                                            type="text"
                                            id="lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            required
                                            className={styles.input}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formField}>
                                        <label htmlFor="email">Email Address *</label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.formField}>
                                        <label htmlFor="phone">Phone Number *</label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            required
                                            className={styles.input}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formField}>
                                    <label htmlFor="address">Address *</label>
                                    <textarea
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        required
                                        rows={3}
                                        className={styles.textarea}
                                    />
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formField}>
                                        <label htmlFor="city">City *</label>
                                        <input
                                            type="text"
                                            id="city"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            required
                                            className={styles.input}
                                            placeholder="e.g., W1D 1BS"
                                        />
                                    </div>

                                    <div className={styles.formField}>
                                        <label htmlFor="postcode">Postcode *</label>
                                        <input
                                            type="text"
                                            id="postcode"
                                            name="postcode"
                                            value={formData.postcode}
                                            onChange={handleInputChange}
                                            required
                                            className={styles.input}
                                            placeholder="e.g., W1D 1BS"
                                        />
                                    </div>

                                    <div className={styles.formField}>
                                        <label htmlFor="country">Country</label>
                                        <select
                                            id="country"
                                            name="country"
                                            value={formData.country}
                                            onChange={handleInputChange}
                                            className={styles.select}
                                        >
                                            <option value="United Kingdom">United Kingdom</option>
                                            <option value="Ireland">Ireland</option>
                                            <option value="France">France</option>
                                            <option value="Germany">Germany</option>
                                            <option value="Spain">Spain</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Options */}
                            <div className={styles.formGroup}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.sectionIcon}>
                                        <Truck size={20} />
                                    </div>
                                    <h2>Delivery Options</h2>
                                </div>

                                <div className={styles.deliveryOptions}>
                                    <label className={`${styles.deliveryOption} ${deliveryOption === 'standard' ? styles.selected : ''}`}>
                                        <input
                                            type="radio"
                                            name="delivery"
                                            value="standard"
                                            checked={deliveryOption === 'standard'}
                                            onChange={() => setDeliveryOption('standard')}
                                            className={styles.radio}
                                        />
                                        <div className={styles.deliveryInfo}>
                                            <div className={styles.deliveryTitle}>
                                                <span className={styles.deliveryName}>Standard Delivery (3-5 business days)</span>
                                                <span className={styles.deliveryPrice}>Free</span>
                                            </div>
                                            <p className={styles.deliveryDescription}>Free delivery</p>
                                        </div>
                                    </label>

                                    <label className={`${styles.deliveryOption} ${deliveryOption === 'express' ? styles.selected : ''}`}>
                                        <input
                                            type="radio"
                                            name="delivery"
                                            value="express"
                                            checked={deliveryOption === 'express'}
                                            onChange={() => setDeliveryOption('express')}
                                            className={styles.radio}
                                        />
                                        <div className={styles.deliveryInfo}>
                                            <div className={styles.deliveryTitle}>
                                                <span className={styles.deliveryName}>Express Delivery (1-2 business days)</span>
                                                <span className={styles.deliveryPrice}>Rs15.00</span>
                                            </div>
                                            <p className={styles.deliveryDescription}>Priority handling and tracking</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Order Summary */}
                    <div className={styles.summarySection}>
                        <div className={styles.orderSummary}>
                            <h2 className={styles.summaryTitle}>Order Summary</h2>

                            <div className={styles.summaryRow}>
                                <span>Subtotal</span>
                                <span>Rs{mockCartTotal.subtotal.toFixed(2)}</span>
                            </div>

                            <div className={styles.summaryRow}>
                                <span>Delivery</span>
                                <span className={deliveryOption === 'standard' ? styles.freeDelivery : ''}>
                                    {deliveryOption === 'standard' ? 'Free' : `Rs${deliveryFee.toFixed(2)}`}
                                </span>
                            </div>

                            <div className={styles.summaryDivider}></div>

                            <div className={styles.summaryTotal}>
                                <span>Total</span>
                                <span>Rs{finalTotal.toFixed(2)}</span>
                            </div>

                            <button type="submit" onClick={handleSubmit} className={styles.checkoutBtn}>
                                <Lock size={20} />
                                Secure Checkout
                            </button>

                            <div className={styles.securityInfo}>
                                <div className={styles.securityIcon}>
                                    <Lock size={16} />
                                </div>
                                <div className={styles.securityText}>
                                    <p className={styles.securityTitle}>256-bit SSL encryption</p>
                                    <p className={styles.securitySubtitle}>Your payment information is secure and encrypted</p>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className={styles.paymentMethods}>
                                <p className={styles.paymentTitle}>We accept:</p>
                                <div className={styles.paymentIcons}>
                                    <span className={styles.paymentIcon}>Cash On Delivery</span>
                                    <span className={styles.paymentIcon}>JazzCash</span>
                                   
                                </div>
                            </div>

                            {/* Warranty Badge */}
                            <div className={styles.warranty}>
                                <ShieldCheck size={24} />
                                <span>10 Days Warranty</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
