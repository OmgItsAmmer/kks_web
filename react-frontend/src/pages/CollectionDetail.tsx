import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Minus, Plus, ChevronDown, Package, 
  ArrowLeft, Check, AlertCircle
} from 'lucide-react';
import styles from './CollectionDetail.module.css';
import { useCollectionDetails, useAddCollectionToCart } from '../hooks/useCollections';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { AuthenticationError } from '../services/api.config';
import Loader from '../components/Loader';
import type { CollectionCartItem } from '../services/collection.service';

interface SelectedVariant {
  itemId: number;
  variantId: number;
  quantity: number;
}

const CollectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const collectionId = id ? parseInt(id, 10) : 0;
  const navigate = useNavigate();
  const { isAuthenticated, showLoginModal, user } = useAuth();
  const { showSuccess, showError, showWarning } = useSnackbar();

  // Fetch collection details
  const { 
    data: collection, 
    isLoading, 
    isError, 
    error 
  } = useCollectionDetails(collectionId > 0 ? collectionId : null);

  // Mutation for adding to cart
  const addToCartMutation = useAddCollectionToCart();

  // State for selected variants and quantities
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([]);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);

  // Initialize selected variants when collection loads
  useEffect(() => {
    if (collection?.items) {
      const initialVariants: SelectedVariant[] = collection.items.map((item) => ({
        itemId: item.collection_item_id,
        variantId: item.variant_id,
        quantity: item.default_quantity,
      }));
      setSelectedVariants(initialVariants);
    }
  }, [collection]);

  // Calculate total price whenever variants or quantities change
  useEffect(() => {
    if (collection?.items && selectedVariants.length > 0) {
      const total = selectedVariants.reduce((sum, selectedVar) => {
        const item = collection.items.find(i => i.collection_item_id === selectedVar.itemId);
        if (!item) return sum;

        // Find the selected variant
        const variant = item.all_variants?.find(v => v.variant_id === selectedVar.variantId);
        if (!variant) return sum;

        return sum + (Number(variant.sell_price) * selectedVar.quantity);
      }, 0);
      setTotalPrice(total);
    }
  }, [collection, selectedVariants]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [collectionId]);

  const handleVariantChange = (itemId: number, newVariantId: number) => {
    setSelectedVariants(prev =>
      prev.map(sv =>
        sv.itemId === itemId ? { ...sv, variantId: newVariantId } : sv
      )
    );
    setOpenDropdown(null);
  };

  const handleQuantityChange = (itemId: number, delta: number) => {
    setSelectedVariants(prev =>
      prev.map(sv => {
        if (sv.itemId === itemId) {
          const newQuantity = Math.max(1, sv.quantity + delta);
          
          // Check stock availability
          const item = collection?.items.find(i => i.collection_item_id === itemId);
          if (item) {
            const variant = item.all_variants?.find(v => v.variant_id === sv.variantId);
            if (variant && newQuantity <= variant.stock) {
              return { ...sv, quantity: newQuantity };
            } else if (variant) {
              showWarning(`Only ${variant.stock} items available in stock`);
            }
          }
        }
        return sv;
      })
    );
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated || !user) {
      showLoginModal();
      return;
    }

    // Validate stock for all items
    const invalidItems = selectedVariants.filter(sv => {
      const item = collection?.items.find(i => i.collection_item_id === sv.itemId);
      if (!item) return true;
      const variant = item.all_variants?.find(v => v.variant_id === sv.variantId);
      if (!variant) return true;
      return sv.quantity > variant.stock || variant.stock === 0;
    });

    if (invalidItems.length > 0) {
      showError('Some items are out of stock or exceed available quantity');
      return;
    }

    try {
      const cartItems: CollectionCartItem[] = selectedVariants.map(sv => ({
        variant_id: sv.variantId,
        quantity: sv.quantity,
      }));

      await addToCartMutation.mutateAsync({
        collectionId,
        customerId: user.id,
        items: cartItems,
      });

      showSuccess('Collection added to cart successfully!');
      
      // Optionally navigate to cart
      // navigate('/cart');
    } catch (err: any) {
      console.error('[CollectionDetail] Error adding to cart:', err);
      if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
        showLoginModal();
      } else {
        showError(err.message || 'Failed to add collection to cart. Please try again.');
      }
    }
  };

  const handleCheckout = async () => {
    if (!isAuthenticated || !user) {
      showLoginModal();
      return;
    }

    // Add to cart first, then navigate to checkout
    await handleAddToCart();
    setTimeout(() => {
      navigate('/checkout');
    }, 1000);
  };

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !collection) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} className={styles.errorIcon} />
        <h2>Collection Not Found</h2>
        <p>{error?.message || 'Unable to load collection details'}</p>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          <ArrowLeft size={20} />
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.collectionDetail}>
      <div className="container">
        {/* Back Button */}
        <button onClick={() => navigate(-1)} className={styles.backBtn}>
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Collection Header */}
        <div className={styles.collectionHeader}>
          <div className={styles.headerImage}>
            <img src={collection.image_url || '/logo.png'} alt={collection.name} />
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.collectionTitle}>{collection.name}</h1>
            {collection.description && (
              <p className={styles.collectionDescription}>{collection.description}</p>
            )}
            <div className={styles.collectionMeta}>
              <div className={styles.metaItem}>
                <Package size={20} />
                <span>{collection.items.length} {collection.items.length === 1 ? 'Item' : 'Items'}</span>
              </div>
              <div className={styles.metaPrice}>
                <span className={styles.totalLabel}>Total:</span>
                <span className={styles.totalPrice}>Rs {totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collection Items */}
        <div className={styles.collectionItems}>
          <h2 className={styles.sectionTitle}>Collection Items</h2>
          <div className={styles.itemsList}>
            {collection.items.map((item) => {
              const selectedVar = selectedVariants.find(sv => sv.itemId === item.collection_item_id);
              const currentVariant = item.all_variants?.find(v => v.variant_id === selectedVar?.variantId) || item;
              const isDropdownOpen = openDropdown === item.collection_item_id;
              const itemTotal = selectedVar ? Number(currentVariant.sell_price) * selectedVar.quantity : 0;

              return (
                <div key={item.collection_item_id} className={styles.collectionItem}>
                  <div className={styles.itemImage}>
                    <img src={item.image_url || '/logo.png'} alt={item.product_name} />
                  </div>
                  
                  <div className={styles.itemDetails}>
                    <h3 className={styles.itemName}>{item.product_name}</h3>
                    
                    {/* Variant Selector */}
                    {item.all_variants && item.all_variants.length > 1 && (
                      <div className={styles.variantSelector}>
                        <label>Variant:</label>
                        <div className={styles.dropdown}>
                          <button
                            className={styles.dropdownButton}
                            onClick={() => setOpenDropdown(isDropdownOpen ? null : item.collection_item_id)}
                          >
                            <span>
                              {currentVariant.variant_name || 'Default'} - Rs {Number(currentVariant.sell_price).toLocaleString()}
                            </span>
                            <ChevronDown size={20} className={isDropdownOpen ? styles.iconRotated : ''} />
                          </button>
                          
                          {isDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                              {item.all_variants.map((variant) => (
                                <button
                                  key={variant.variant_id}
                                  className={`${styles.dropdownItem} ${selectedVar?.variantId === variant.variant_id ? styles.active : ''}`}
                                  onClick={() => handleVariantChange(item.collection_item_id, variant.variant_id)}
                                  disabled={variant.stock === 0}
                                >
                                  <span>{variant.variant_name || 'Default'}</span>
                                  <div className={styles.variantInfo}>
                                    <span className={styles.variantPrice}>Rs {Number(variant.sell_price).toLocaleString()}</span>
                                    <span className={`${styles.stockBadge} ${variant.stock === 0 ? styles.outOfStock : variant.stock < 5 ? styles.lowStock : ''}`}>
                                      {variant.stock === 0 ? 'Out of Stock' : variant.stock < 5 ? `Only ${variant.stock} left` : 'In Stock'}
                                    </span>
                                  </div>
                                  {selectedVar?.variantId === variant.variant_id && (
                                    <Check size={20} className={styles.checkIcon} />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quantity Selector */}
                    <div className={styles.quantitySelector}>
                      <label>Quantity:</label>
                      <div className={styles.quantityControls}>
                        <button
                          onClick={() => handleQuantityChange(item.collection_item_id, -1)}
                          disabled={!selectedVar || selectedVar.quantity <= 1}
                          className={styles.quantityBtn}
                        >
                          <Minus size={16} />
                        </button>
                        <span className={styles.quantityValue}>{selectedVar?.quantity || 1}</span>
                        <button
                          onClick={() => handleQuantityChange(item.collection_item_id, 1)}
                          disabled={!selectedVar || selectedVar.quantity >= currentVariant.stock}
                          className={styles.quantityBtn}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <span className={styles.stockInfo}>
                        {currentVariant.stock} available
                      </span>
                    </div>

                    {/* Item Price */}
                    <div className={styles.itemPrice}>
                      <span className={styles.priceLabel}>Item Total:</span>
                      <span className={styles.priceValue}>Rs {itemTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionSection}>
          <div className={styles.priceBreakdown}>
            <div className={styles.breakdownRow}>
              <span>Subtotal ({collection.items.length} items):</span>
              <span>Rs {totalPrice.toLocaleString()}</span>
            </div>
            <div className={`${styles.breakdownRow} ${styles.total}`}>
              <span>Total:</span>
              <span>Rs {totalPrice.toLocaleString()}</span>
            </div>
          </div>

          <div className={styles.actionButtons}>
            <button
              className={styles.addToCartBtn}
              onClick={handleAddToCart}
              disabled={addToCartMutation.isPending || totalPrice === 0}
            >
              <ShoppingCart size={20} />
              {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
            </button>
            <button
              className={styles.checkoutBtn}
              onClick={handleCheckout}
              disabled={addToCartMutation.isPending || totalPrice === 0}
            >
              Checkout Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionDetail;
