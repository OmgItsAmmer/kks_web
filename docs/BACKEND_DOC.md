# E-Commerce Backend Documentation

## Overview

This document provides comprehensive documentation for the backend logic of the Flutter e-commerce application. The application uses **Supabase** as the backend-as-a-service (BaaS) platform, which provides PostgreSQL database, authentication, storage, and real-time capabilities.

## Architecture

### Technology Stack
- **Backend Platform**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **State Management**: GetX
- **Architecture Pattern**: Repository Pattern with Service Layer
- **Authentication**: Supabase Auth (Email/Password + OAuth Google Sign-In)
- **Storage**: Supabase Storage (for images and media)
- **Local Storage**: GetStorage (for caching) + FlutterSecureStorage (for sensitive tokens)

### Design Patterns
1. **Repository Pattern**: Separates data access logic from business logic
2. **Service Layer**: Provides additional abstraction for complex operations
3. **Controller Pattern**: Manages UI state and business logic
4. **Singleton Pattern**: Used for repository and service instances

---

## Database Schema

### Core Tables

#### 1. **customers** (User Management)
Primary table for customer information.

**Columns**:
- `customer_id` (PK, serial): Auto-incrementing customer ID
- `auth_uid` (text, unique): Supabase Auth user ID
- `email` (text, unique): Customer email
- `first_name` (text): First name
- `last_name` (text): Last name
- `phone_number` (text): Phone number
- `cnic` (text): National ID card number
- `gender` (text): Gender (male/female/other)
- `dob` (timestamp): Date of birth
- `fcm_token` (text): Firebase Cloud Messaging token for push notifications
- `created_at` (timestamp): Account creation timestamp
- `updated_at` (timestamp): Last update timestamp

**Relationships**:
- One-to-Many with `addresses`
- One-to-Many with `orders`
- One-to-Many with `cart`
- One-to-Many with `wishlist`
- One-to-Many with `reviews`

---

#### 2. **products** (Product Catalog)
Main product information table.

**Columns**:
- `product_id` (PK, serial): Product ID
- `name` (text): Product name
- `description` (text): Product description
- `base_price` (text): Base price
- `sale_price` (text): Sale price (if on sale)
- `price_range` (text): Price range for products with variations
- `category_id` (int, FK): References `categories.category_id`
- `brandID` (int, FK): References `brands.brandID`
- `stock_quantity` (int): Total stock quantity
- `ispopular` (boolean): Whether product is marked as popular
- `created_at` (timestamp): Creation timestamp
- `updated_at` (timestamp): Last update timestamp

**Relationships**:
- Many-to-One with `categories`
- Many-to-One with `brands`
- One-to-Many with `product_variants`
- One-to-Many with `reviews`
- One-to-Many with `wishlist`

---

#### 3. **product_variants** (Product Variations)
Stores product variations (e.g., size, color combinations).

**Columns**:
- `variant_id` (PK, serial): Variant ID
- `product_id` (int, FK): References `products.product_id`
- `variant_name` (text): Variant name (e.g., "Red - Large")
- `sell_price` (text): Selling price for this variant
- `buy_price` (text): Purchase/cost price
- `stock` (int): Stock quantity for this variant
- `is_visible` (boolean): Whether variant is visible to customers
- `created_at` (timestamp): Creation timestamp
- `updated_at` (timestamp): Last update timestamp

**Relationships**:
- Many-to-One with `products`
- One-to-Many with `cart`
- One-to-Many with `order_items`

---

#### 4. **categories** (Product Categories)
Product categorization table.

**Columns**:
- `category_id` (PK, serial): Category ID
- `category_name` (text): Category name
- `created_at` (timestamp): Creation timestamp

**Relationships**:
- One-to-Many with `products`

---

#### 5. **brands** (Product Brands)
Brand information table.

**Columns**:
- `brandID` (PK, serial): Brand ID
- `brand_name` (text): Brand name
- `created_at` (timestamp): Creation timestamp

**Relationships**:
- One-to-Many with `products`

---

#### 6. **cart** (Shopping Cart)
Customer shopping cart items.

**Columns**:
- `cart_id` (PK, serial): Cart item ID
- `customer_id` (int, FK): References `customers.customer_id`
- `variant_id` (int, FK): References `product_variants.variant_id`
- `quantity` (text): Quantity (stored as text for flexibility)
- `created_at` (timestamp): When item was added to cart

**Relationships**:
- Many-to-One with `customers`
- Many-to-One with `product_variants`

**Business Rules**:
- Enforces shop-level maximum quantity limits per item
- Validates stock availability before adding to cart
- Supports cart stock validation and adjustment

---

#### 7. **orders** (Customer Orders)
Main order information table.

**Columns**:
- `order_id` (PK, serial): Order ID
- `customer_id` (int, FK): References `customers.customer_id`
- `order_date` (timestamp): Order placement date
- `total_amount` (text): Total order amount
- `status` (text): Order status (pending, processing, shipped, delivered, cancelled)
- `payment_method` (text): Payment method used
- `address_id` (int, FK): References `order_addresses.address_id`
- `created_at` (timestamp): Creation timestamp
- `updated_at` (timestamp): Last update timestamp

**Relationships**:
- Many-to-One with `customers`
- Many-to-One with `order_addresses`
- One-to-Many with `order_items`

---

#### 8. **order_items** (Order Line Items)
Individual items within an order.

**Columns**:
- `order_item_id` (PK, serial): Order item ID
- `order_id` (int, FK): References `orders.order_id`
- `variant_id` (int, FK): References `product_variants.variant_id`
- `quantity` (int): Quantity ordered
- `price` (text): Price at time of order
- `created_at` (timestamp): Creation timestamp

**Relationships**:
- Many-to-One with `orders`
- Many-to-One with `product_variants`

---

#### 9. **addresses** (Customer Addresses)
Customer shipping/billing addresses.

**Columns**:
- `address_id` (PK, serial): Address ID
- `customer_id` (int, FK): References `customers.customer_id`
- `street` (text): Street address
- `city` (text): City
- `state` (text): State/Province
- `postal_code` (text): Postal/ZIP code
- `country` (text): Country
- `phone_number` (text): Contact phone number
- `is_default` (boolean): Whether this is the default address
- `created_at` (timestamp): Creation timestamp
- `updated_at` (timestamp): Last update timestamp

**Relationships**:
- Many-to-One with `customers`

---

#### 10. **order_addresses** (Order Address Snapshots)
Immutable address snapshots for orders (prevents issues if customer changes address).

**Columns**:
- `address_id` (PK, serial): Address snapshot ID
- `street` (text): Street address
- `city` (text): City
- `state` (text): State/Province
- `postal_code` (text): Postal/ZIP code
- `country` (text): Country
- `phone_number` (text): Contact phone number
- `created_at` (timestamp): Creation timestamp

**Relationships**:
- One-to-Many with `orders`

---

#### 11. **wishlist** (Customer Wishlist)
Customer saved/favorite products.

**Columns**:
- `wishlist_id` (PK, serial): Wishlist item ID
- `customer_id` (int, FK): References `customers.customer_id`
- `product_id` (int, FK): References `products.product_id`
- `created_at` (timestamp): When item was added

**Relationships**:
- Many-to-One with `customers`
- Many-to-One with `products`

---

#### 12. **reviews** (Product Reviews)
Customer product reviews and ratings.

**Columns**:
- `review_id` (PK, serial): Review ID
- `product_id` (int, FK): References `products.product_id`
- `customer_id` (int, FK): References `customers.customer_id`
- `review` (text): Review text
- `rating` (numeric): Rating (typically 1-5)
- `created_at` (timestamp): Review creation timestamp
- `updated_at` (timestamp): Last update timestamp

**Relationships**:
- Many-to-One with `products`
- Many-to-One with `customers`

---

#### 13. **shop** (Shop Configuration)
Global shop settings and configurations.

**Columns**:
- `shop_id` (PK, serial): Shop ID
- `is_shipping_enable` (boolean): Whether shipping is enabled
- `max_allowed_item_quantity` (int): Maximum quantity per item in cart
- `created_at` (timestamp): Creation timestamp
- `updated_at` (timestamp): Last update timestamp

---

#### 14. **app_versions** (App Version Control)
App version management for force updates and app locking.

**Columns**:
- `version_id` (PK, serial): Version ID
- `version_number` (text): Version number (e.g., "1.0.0")
- `is_force_update` (boolean): Whether update is mandatory
- `is_app_locked` (boolean): Whether app is locked for all users
- `created_at` (timestamp): Creation timestamp

---

#### 15. **images** (Media Storage Metadata)
Image metadata for all entities.

**Columns**:
- `image_id` (PK, serial): Image ID
- `filename` (text): Filename in storage bucket
- `folderType` (text): Storage bucket/folder type
- `created_at` (timestamp): Upload timestamp

**Relationships**:
- One-to-Many with `image_entity`

---

#### 16. **image_entity** (Image-Entity Relationships)
Links images to entities (products, brands, categories, customers).

**Columns**:
- `image_entity_id` (PK, serial): Relationship ID
- `image_id` (int, FK): References `images.image_id`
- `entity_id` (int): ID of the entity (product_id, brand_id, etc.)
- `entity_category` (text): Entity type (products, brands, categories, customers)
- `isFeatured` (boolean): Whether this is the featured/main image
- `created_at` (timestamp): Creation timestamp

**Relationships**:
- Many-to-One with `images`

---

## Repository Layer

### 1. Authentication Repository
**File**: `lib/data/repositories/authentication/authentication_repository.dart`

**Responsibilities**:
- User authentication (email/password, OAuth)
- Session management
- Token refresh and validation
- User logout
- Inactivity timeout enforcement (40 days)

**Key Methods**:

#### `loginWithEmailAndpassword(String email, String password)`
- Authenticates user with email and password
- Stores refresh token securely in FlutterSecureStorage
- Updates last activity timestamp
- **Returns**: `Future<void>`
- **Throws**: `TFormatException`, `TPlatformException`, or generic error

#### `sendPasswordResetEmail(String email)`
- Initiates password reset flow
- **Returns**: `Future<void>`

#### `logOut()`
- Signs out from Google Sign-In service
- Revokes refresh token on server
- Clears all local sessions and cached data
- Navigates to login screen
- **Returns**: `Future<void>`

#### `checkSession()`
- Validates current session with server
- Attempts token refresh if expired
- Enforces 40-day inactivity timeout
- **Returns**: `Future<bool>` - true if session is valid

#### `screenRedirect()`
- Handles navigation after authentication
- Checks session validity
- Verifies customer record exists
- Initializes controllers and fetches data
- Handles app version checks and locks
- **Returns**: `Future<void>`

#### `handleSuccessfulSignIn(Session session)`
- Handles OAuth sign-in completion
- Creates customer record if needed
- Initializes app version checks
- Navigates to main app
- **Returns**: `Future<void>`

**Token Management**:
- **Access Token**: Short-lived (~15 min), managed in-memory by Supabase
- **Refresh Token**: Long-lived (~40 days), stored securely in FlutterSecureStorage
- **Token Rotation**: Refresh tokens are rotated on each refresh for security

**Inactivity Policy**:
- Maximum inactivity: 40 days
- Activity timestamp updated on:
  - Successful sign-in
  - Token refresh
  - Session validation
- Enforced during `checkSession()`

---

### 2. Customer Repository
**File**: `lib/data/repositories/user/user_repository.dart`

**Responsibilities**:
- Customer CRUD operations
- Customer profile management
- Extra information updates (CNIC, phone, gender, DOB)

**Key Methods**:

#### `fetchCustomerDetials(String customerEmail)`
- Fetches customer details by email
- **Returns**: `Future<CustomerModel?>` - null if not found
- Handles RLS (Row Level Security) violations gracefully

#### `fetchCustomerDetailsByAuthId(String authUid)`
- Fetches customer details by Auth UID (more reliable than email)
- **Returns**: `Future<CustomerModel?>`

#### `saveCustomerRecordInSupabase(CustomerModel customer)`
- Inserts new customer record
- **Returns**: `Future<void>`

#### `addExtraInfo(CustomerModel customerModel)`
- Updates customer with additional information (CNIC, phone, gender, DOB)
- **Returns**: `Future<bool>` - success status

#### `doesCustomerExist(String userId)`
- Checks if customer record exists for auth user
- **Returns**: `Future<bool>`

#### `insertCustomerFromGoogle(User user)`
- Creates customer record from Google OAuth user data
- Splits full name into first and last name
- Uses CustomerService for insertion
- **Returns**: `Future<bool>`

#### `getCustomerNameFromCustomerPublicInfo(int customerId)`
- Retrieves customer full name by customer ID
- **Returns**: `Future<String>` - "Anonymous" if error

---

### 3. Customer Service
**File**: `lib/data/repositories/user/customer_service.dart`

**Responsibilities**:
- Simplified customer insertion
- Customer data validation
- Auth-customer relationship management

**Key Methods**:

#### `insertCustomer({...})`
- Inserts customer with full details
- Validates auth_uid is provided
- Converts DateTime to ISO string for Supabase
- **Parameters**: phoneNumber, firstName, lastName, cnic, email, dob, gender, authUid, fcmToken
- **Returns**: `Future<bool>`

#### `insertBasicCustomer({...})`
- Simplified insertion using current authenticated user
- **Parameters**: firstName, lastName, email, phoneNumber
- **Returns**: `Future<bool>`

#### `getCustomerByAuthUid(String authUid)`
- Retrieves customer data by auth UID
- **Returns**: `Future<Map<String, dynamic>?>`

#### `updateCustomer({...})`
- Updates customer information
- Only updates provided fields (null fields are ignored)
- **Returns**: `Future<bool>`

#### `doesUserExistInAuth(String authUid)`
- Checks if user exists in Supabase Auth
- **Returns**: `Future<bool>`

#### `doesCustomerExist(String authUid)`
- Checks if customer record exists
- **Returns**: `Future<bool>`

---

### 4. Product Repository
**File**: `lib/data/repositories/product/product_repository.dart`

**Responsibilities**:
- Product catalog management
- Product search and filtering
- Product variations management
- Caching for performance optimization

**Caching Strategy**:
- Cache expiry: 30 minutes
- Cached data: Products, variations, search suggestions
- Cache keys: Based on query parameters (category, brand, page, etc.)

**Key Methods**:

#### `fetchPopularProducts({int limit = 10, int offset = 0})`
- Fetches popular products with pagination
- Uses caching to reduce database calls
- **Returns**: `Future<List<ProductModel>>`

#### `fetchProductsByCategory(int categoryId, {int page = 0, int pageSize = 20})`
- Fetches products by category with pagination
- Implements caching per category and page
- **Returns**: `Future<List<ProductModel>>`

#### `fetchProductsByBrand(int brandId, {int limit = 50})`
- Fetches products by brand
- **Returns**: `Future<List<ProductModel>>`

#### `fetchProductById(int productId)`
- Fetches single product by ID
- **Returns**: `Future<ProductModel>`

#### `searchProducts(String query, {int page = 0, int pageSize = 20})`
- Searches products by name using ILIKE (case-insensitive)
- Prevents wildcard-only queries
- Implements pagination
- **Returns**: `Future<List<ProductModel>>`

#### `getSearchSuggestions(String query)`
- Provides autocomplete suggestions
- Minimum query length: 2 characters
- Limits results to 10 suggestions
- Uses caching
- **Returns**: `Future<List<String>>`

#### `fetchProductTable({int page = 0, int pageSize = 20, bool forceRefresh = false})`
- Fetches all products with pagination
- Use sparingly to avoid performance issues
- **Returns**: `Future<List<ProductModel>>`

#### `fetchProductVariationsWithID(int productId)`
- Fetches visible product variations
- Filters by `is_visible = true`
- Uses caching
- **Returns**: `Future<List<ProductVariationModel>>`

#### `fetchAllProductVariationsWithID(int productId)`
- Fetches all variations including hidden ones
- For admin purposes
- **Returns**: `Future<List<ProductVariationModel>>`

#### `fetchProductsByIds(List<int> productIds)`
- Batch fetch multiple products by IDs
- Useful for wishlist and cart
- **Returns**: `Future<List<ProductModel>>`

#### `getProductCount({int? categoryId, int? brandId})`
- Gets total product count with optional filters
- **Returns**: `Future<int>`

#### `getPopularProductsCount()`
- Gets count of popular products
- **Returns**: `Future<int>`

#### `clearCache()`
- Clears all cached data
- **Returns**: `void`

#### `clearCacheByKey(String pattern)`
- Clears cache entries matching pattern
- **Returns**: `void`

---

### 5. Cart Repository
**File**: `lib/data/repositories/product/cart_repository.dart`

**Responsibilities**:
- Shopping cart CRUD operations
- Cart validation and stock checking
- Shop-level quantity limit enforcement
- Cart-to-kiosk transfer

**Key Methods**:

#### `fetchCartItems(String userID)`
- Fetches basic cart items for user
- **Returns**: `Future<List<CartModel>>`

#### `fetchCompleteCartItems(int customerId)`
- Fetches cart with joined product and variant details
- Optimized single-query approach
- **Returns**: `Future<List<CartItemModel>>`

#### `addToCart(int customerId, int variantId, int quantity)`
- Adds item to cart or updates quantity if exists
- Implements upsert logic
- **Returns**: `Future<bool>`

#### `updateCartItemQuantity(int cartId, int newQuantity)`
- Updates cart item quantity by cart ID
- **Returns**: `Future<bool>`

#### `updateCartItemByVariant(int variantId, int customerId, int newQuantity)`
- Updates cart item quantity by variant ID
- **Returns**: `Future<bool>`

#### `removeCartItem(int cartId)`
- Removes specific cart item
- **Returns**: `Future<bool>`

#### `removeCartItemByVariant(int variantId, int customerId)`
- Removes cart item by variant ID
- **Returns**: `Future<bool>`

#### `clearCart(int customerId)`
- Removes all items from cart
- **Returns**: `Future<bool>`

#### `getCartItemCount(int customerId)`
- Gets total number of distinct items in cart
- **Returns**: `Future<int>`

#### `validateVariant(int variantId, int newStock, int customerId)`
- Validates variant and updates stock with validation
- Calls RPC function `update_variant_stock_with_validation`
- **Returns**: `Future<bool>`

#### `canAddToCart(int variantId, int newQuantity)`
- Validates if quantity can be added to cart
- Calls RPC function `add_to_cart_validation`
- **Returns**: `Future<bool>`

#### `checkShopLimit({required int customerId, required int variantId, required int newQuantity})`
- Validates shop-level per-item quantity limits
- Calls RPC function `validate_add_to_cart_shop_limit`
- **Returns**: `Future<ShopLimitValidationResult>`
- **Result includes**:
  - `allowed`: Whether addition is allowed
  - `canAddQuantity`: How many can be added
  - `maxAllowedQuantity`: Shop maximum
  - `currentQuantity`: Current quantity in cart
  - `remainingQuantity`: How many more can be added

#### `validateCartStock(int customerId)`
- Validates all cart items against current stock
- Calls RPC function `validate_and_adjust_cart_stock`
- **Returns**: `Future<List<CartStockValidation>>`

#### `applyCartAdjustments(int customerId, List<CartStockValidation> adjustments)`
- Applies stock adjustments to cart
- Calls RPC function `apply_cart_adjustments`
- **Returns**: `Future<bool>`

#### `transferCartToKiosk(int customerId, String kioskSessionId)`
- Transfers cart items to kiosk cart for in-store checkout
- Calls RPC function `transfer_cart_to_kiosk`
- **Returns**: `Future<bool>`

**Database Functions Used**:
1. `update_variant_stock_with_validation`: Validates and updates variant stock
2. `add_to_cart_validation`: Validates if item can be added to cart
3. `validate_add_to_cart_shop_limit`: Enforces shop quantity limits
4. `validate_and_adjust_cart_stock`: Validates entire cart stock
5. `apply_cart_adjustments`: Applies cart adjustments
6. `transfer_cart_to_kiosk`: Transfers cart to kiosk

---

### 6. Order Repository
**File**: `lib/data/repositories/orders/order_repository.dart`

**Responsibilities**:
- Order creation and retrieval
- Order items management

**Key Methods**:

#### `fetchOrderTable(int customerId)`
- Fetches all orders for a customer
- **Returns**: `Future<List<OrderModel>>`

#### `insertSingleOrder(OrderModel order)`
- Inserts new order and returns order ID
- **Returns**: `Future<int>` - order_id or -1 on error

#### `insertSingleOrderItems(List<OrderItemModel> listOfMaps)`
- Inserts multiple order items using upsert
- **Returns**: `Future<void>`

#### `fetchOrderItems(int orderId)`
- Fetches all items for a specific order
- **Returns**: `Future<List<OrderItemModel>>`

---

### 7. Address Repository
**File**: `lib/data/repositories/address/address_repository.dart`

**Responsibilities**:
- Customer address management
- Address-to-order-address copying

**Key Methods**:

#### `fetchCustomerAddresses(int customerId)`
- Fetches all addresses for a customer
- **Returns**: `Future<List<AddressModel>>`

#### `insertNewAddress(AddressModel address)`
- Inserts new address and returns address ID
- **Returns**: `Future<int>` - address_id or -1 on error

#### `fetchAddressById(int addressId)`
- Fetches order address by ID
- **Returns**: `Future<List<OrderAddressModel>>`

#### `copyAddressToOrderAddresses(int addressId)`
- Copies address to order_addresses table (immutable snapshot)
- Calls RPC function `copy_address_to_order_address`
- **Returns**: `Future<bool>`

#### `updateAddress(AddressModel address)`
- Updates existing address
- **Returns**: `Future<bool>`

#### `deleteAddress(int addressId)`
- Deletes address by ID
- **Returns**: `Future<bool>`

**Database Functions Used**:
1. `copy_address_to_order_address`: Creates immutable address snapshot for orders

---

### 8. Category Repository
**File**: `lib/data/repositories/categories/category_repository.dart`

**Responsibilities**:
- Category retrieval
- Category sorting

**Key Methods**:

#### `getALLCategories()`
- Fetches all categories
- Sorts alphabetically with "More" category always last
- Requires authenticated user
- **Returns**: `Future<List<CategoryModel>>`

---

### 9. Brand Repository
**File**: `lib/data/repositories/brands/brand_repository.dart`

**Responsibilities**:
- Brand CRUD operations

**Key Methods**:

#### `fetchAllBrands()`
- Fetches all brands
- **Returns**: `Future<List<BrandModel>>`

#### `updateBrand(BrandModel brand)`
- Updates brand information
- **Returns**: `Future<void>`

#### `getBrandById(int brandID)`
- Fetches single brand by ID
- **Returns**: `Future<BrandModel?>`

---

### 10. Wishlist Repository
**File**: `lib/data/repositories/wishlist/wishlist_repository.dart`

**Responsibilities**:
- Wishlist management

**Key Methods**:

#### `fetchWishListTableWithUserId(int customerId)`
- Fetches all wishlist items for customer
- **Returns**: `Future<List<WishlistModel>>`

#### `addWishListRow(Map<String, dynamic> map)`
- Adds item to wishlist
- **Returns**: `Future<void>`

#### `removeItemFromWishListTable(int productId, int customerId)`
- Removes item from wishlist
- **Returns**: `Future<void>`

---

### 11. Review Repository
**File**: `lib/data/repositories/reviews/review_repository.dart`

**Responsibilities**:
- Product review management

**Key Methods**:

#### `fetchProductReviews(int productId)`
- Fetches all reviews for a product
- **Returns**: `Future<List<ReviewModel>>`

#### `addReview(ReviewModel review)`
- Adds new review
- **Returns**: `Future<bool>`

#### `editReview(ReviewModel review)`
- Updates existing review
- **Returns**: `Future<bool>`

#### `deleteReview(int reviewId)`
- Deletes review by ID
- **Returns**: `Future<bool>`

---

### 12. Shop Repository
**File**: `lib/data/repositories/shop/shop_repository.dart`

**Responsibilities**:
- Shop configuration retrieval

**Key Methods**:

#### `isShippingAllowed()`
- Checks if shipping is enabled
- **Returns**: `Future<bool>`

#### `maxAllowedQuantity()`
- Gets maximum allowed quantity per item
- Default: 50 if not set
- **Returns**: `Future<int>`

---

### 13. App Version Repository
**File**: `lib/data/repositories/app_version/app_version_repository.dart`

**Responsibilities**:
- App version management
- Force update and app lock checks

**Key Methods**:

#### `fetchLatestAppVersion()`
- Fetches latest app version configuration
- Orders by created_at descending
- **Returns**: `Future<AppVersionModel>`

---

### 14. Media Repository
**File**: `lib/data/repositories/media/mediarepository.dart`

**Responsibilities**:
- Image upload and retrieval
- Image-entity relationship management
- Profile picture management

**Key Methods**:

#### `fetchMainImageUrl(int entityId, String entityType)`
- Fetches featured image URL for entity
- **Returns**: `Future<String?>`

#### `fetchAllImagesForEntity(int entityId, String entityType)`
- Fetches all images for entity
- **Returns**: `Future<List<String>>`

#### `fetchMultipleMainImages(List<int> entityIds, String entityType)`
- Batch fetch main images for multiple entities
- Optimized for product lists
- **Returns**: `Future<Map<int, String>>`

#### `uploadImage(File imageFile, String entityType, int entityId, {bool isFeatured = true})`
- Uploads image to storage
- Saves metadata to database
- Creates image-entity relationship
- **Returns**: `Future<String?>` - public URL

#### `updateImage(File imageFile, String entityType, int entityId, {bool isFeatured = true})`
- Deletes old image and uploads new one
- **Returns**: `Future<String?>`

#### `deleteEntityImages(int entityId, String entityType)`
- Deletes all images for entity
- **Returns**: `Future<bool>`

#### `hasImages(int entityId, String entityType)`
- Checks if entity has any images
- **Returns**: `Future<bool>`

**Profile Picture Methods**:

#### `fetchCustomerProfilePicture(int customerId)`
- Fetches customer profile picture URL
- **Returns**: `Future<String?>`

#### `uploadProfilePicture(File imageFile, int customerId)`
- Uploads customer profile picture
- **Returns**: `Future<String?>`

#### `updateProfilePicture(File imageFile, int customerId)`
- Updates customer profile picture
- **Returns**: `Future<String?>`

#### `deleteProfilePicture(int customerId)`
- Deletes customer profile picture
- **Returns**: `Future<bool>`

**Storage Buckets**:
- `products`: Product images
- `brands`: Brand logos
- `categories`: Category images
- `customers`: Customer profile pictures

**Image URL Strategy**:
- Uses signed URLs with 24-hour expiration
- Prevents unauthorized access
- Automatically refreshed when needed

---

## Database Functions (RPC)

The backend uses several PostgreSQL functions for complex operations:

### 1. Cart Management Functions

#### `update_variant_stock_with_validation(p_variant_id_input, p_new_stock_value_input, p_customer_id_input)`
- Validates variant exists
- Updates stock with validation
- **Returns**: `boolean`

#### `add_to_cart_validation(p_variant_id_input, p_new_quantity_input)`
- Validates if quantity can be added
- Checks stock availability
- **Returns**: `boolean`

#### `validate_add_to_cart_shop_limit(p_customer_id, p_variant_id, p_new_quantity)`
- Enforces shop-level quantity limits
- Returns detailed validation result
- **Returns**: `json` with fields:
  - `allowed`: boolean
  - `can_add_quantity`: integer
  - `max_allowed_quantity`: integer
  - `current_quantity`: integer
  - `remaining_quantity`: integer

#### `validate_and_adjust_cart_stock(p_customer_id)`
- Validates all cart items against stock
- Returns adjustment suggestions
- **Returns**: `json array` of cart stock validations

#### `apply_cart_adjustments(p_customer_id, p_adjustments)`
- Applies stock adjustments to cart
- Updates or removes items as needed
- **Returns**: `boolean`

#### `transfer_cart_to_kiosk(p_customer_id, p_kiosk_session_id)`
- Transfers cart items to kiosk cart
- For in-store checkout
- **Returns**: `boolean`

### 2. Address Management Functions

#### `copy_address_to_order_address(p_address_id)`
- Creates immutable address snapshot
- Prevents issues if customer changes address after order
- **Returns**: `boolean`

---

## Authentication Flow

### 1. Email/Password Sign-In
```
1. User enters email and password
2. Call supabase.auth.signInWithPassword()
3. On success:
   - Persist refresh token securely
   - Update last activity timestamp
   - Trigger auth state change listener
4. Auth state listener calls handleSuccessfulSignIn()
5. Set up customer details
6. Initialize controllers
7. Check app version and locks
8. Navigate to main app
```

### 2. Google OAuth Sign-In
```
1. User clicks Google Sign-In
2. OAuth flow initiated
3. On success:
   - Auth state change event fired
   - Persist refresh token
   - Update last activity
4. handleSuccessfulSignIn() called
5. Check if customer record exists
6. If not, create customer from OAuth data
7. Initialize controllers
8. Navigate to main app
```

### 3. Session Restoration
```
1. App launches
2. Check for OAuth callback (web only)
3. Attempt token refresh if needed
4. Call screenRedirect()
5. Validate session with checkSession()
6. If valid:
   - Verify customer exists
   - Initialize controllers
   - Navigate to main app
7. If invalid:
   - Navigate to login/onboarding
```

### 4. Token Refresh
```
1. Check if access token is expired
2. Retrieve stored refresh token from FlutterSecureStorage
3. Call supabase.auth.setSession(refreshToken)
4. On success:
   - New access token issued
   - Refresh token may be rotated
   - Persist new refresh token
   - Update last activity
5. On failure:
   - Force logout
```

### 5. Inactivity Timeout
```
1. Last activity timestamp stored in GetStorage
2. On each session check:
   - Calculate time since last activity
   - If > 40 days:
     - Force logout
     - Clear all sessions
     - Navigate to login
3. Activity updated on:
   - Sign-in
   - Token refresh
   - Session validation
```

---

## Security Features

### 1. Row Level Security (RLS)
- Implemented on all tables
- Ensures users can only access their own data
- Enforced at database level

### 2. Token Security
- **Access Token**: In-memory only, short-lived
- **Refresh Token**: Encrypted storage (FlutterSecureStorage)
- **Token Rotation**: Refresh tokens rotated on each refresh

### 3. Secure Storage
- **FlutterSecureStorage**: For refresh tokens
  - Android: Encrypted SharedPreferences
  - iOS: Keychain with first_unlock accessibility
- **GetStorage**: For non-sensitive cache data

### 4. Input Validation
- All user inputs validated before database operations
- SQL injection prevented by Supabase parameterized queries
- XSS prevention through proper data sanitization

### 5. Authentication Checks
- All repository methods assume authenticated user
- Controllers verify authentication before operations
- Session validation on app launch and resume

---

## Caching Strategy

### 1. Product Caching
- **Cache Duration**: 30 minutes
- **Cached Data**:
  - Popular products
  - Category products
  - Brand products
  - Search suggestions
  - Product variations
- **Cache Keys**: Based on query parameters
- **Invalidation**: Time-based expiry

### 2. Image Caching
- **Strategy**: Signed URLs with 24-hour expiration
- **Client-side caching**: Handled by Flutter image cache
- **Optimization**: Batch fetching for multiple images

### 3. Local Storage Caching
- **GetStorage**: For user preferences, cart state, addresses
- **Cleared on logout**: Ensures data privacy

---

## Error Handling

### 1. Repository Level
- Try-catch blocks around all database operations
- User-friendly error messages via TLoader
- Debug logging in development mode
- Graceful degradation (return empty lists/null on error)

### 2. Controller Level
- Validates data before repository calls
- Shows loading indicators during operations
- Displays error messages to user
- Maintains app stability on errors

### 3. Network Errors
- NetworkManager checks connectivity
- Retry logic for critical operations
- Offline mode support (limited)

---

## Performance Optimizations

### 1. Database Queries
- **Pagination**: All list queries support pagination
- **Selective Fetching**: Only fetch required columns
- **Joins**: Optimized joins to reduce round trips
- **Indexing**: Database indexes on foreign keys and frequently queried columns

### 2. Batch Operations
- `fetchProductsByIds()`: Batch fetch products
- `fetchMultipleMainImages()`: Batch fetch images
- `insertSingleOrderItems()`: Batch insert order items

### 3. Lazy Loading
- Products loaded on demand
- Images loaded as needed
- Controllers initialized progressively

### 4. Caching
- 30-minute cache for products
- 24-hour signed URLs for images
- Local storage for frequently accessed data

---

## Data Models

### Key Models

#### CustomerModel
```dart
{
  customerId: int?,
  authUid: String,
  email: String,
  firstName: String,
  lastName: String,
  phoneNumber: String?,
  cnic: String?,
  gender: String?,
  dob: DateTime?,
  fcmToken: String?,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

#### ProductModel
```dart
{
  productId: int,
  name: String,
  description: String,
  basePrice: String,
  salePrice: String,
  priceRange: String,
  categoryId: int,
  brandID: int,
  stockQuantity: int,
  isPopular: bool,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

#### ProductVariationModel
```dart
{
  variantId: int,
  productId: int,
  variantName: String,
  sellPrice: String,
  buyPrice: String,
  stock: int,
  isVisible: bool,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

#### CartModel
```dart
{
  cartId: int,
  customerId: int,
  variantId: int,
  quantity: String,
  createdAt: DateTime
}
```

#### OrderModel
```dart
{
  orderId: int,
  customerId: int,
  orderDate: DateTime,
  totalAmount: String,
  status: String,
  paymentMethod: String,
  addressId: int,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

#### AddressModel
```dart
{
  addressId: int?,
  customerId: int,
  street: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  phoneNumber: String,
  isDefault: bool,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

---

## Business Logic

### 1. Cart Management
- **Add to Cart**:
  1. Validate variant exists and is visible
  2. Check stock availability
  3. Enforce shop quantity limits
  4. If item exists, update quantity
  5. If new item, insert into cart

- **Cart Validation**:
  1. Validate all items against current stock
  2. Generate adjustment suggestions
  3. Apply adjustments (update quantities or remove items)
  4. Notify user of changes

- **Checkout**:
  1. Validate cart stock
  2. Create order address snapshot
  3. Create order record
  4. Create order items
  5. Clear cart
  6. Update product stock

### 2. Order Processing
- **Order Creation**:
  1. Validate cart is not empty
  2. Validate shipping address
  3. Calculate total amount
  4. Create order address snapshot
  5. Insert order record
  6. Insert order items
  7. Clear cart
  8. Send confirmation

- **Order Status Flow**:
  - `pending` → `processing` → `shipped` → `delivered`
  - Can be `cancelled` at any stage before `shipped`

### 3. Product Search
- **Search Algorithm**:
  1. Sanitize query (remove wildcards)
  2. Use ILIKE for case-insensitive search
  3. Implement pagination
  4. Cache results for 30 minutes

- **Suggestions**:
  1. Minimum 2 characters
  2. Limit to 10 results
  3. Remove duplicates
  4. Cache for quick response

### 4. Image Management
- **Upload Flow**:
  1. Generate unique filename
  2. Upload to Supabase storage bucket
  3. Save metadata to images table
  4. Create image-entity relationship
  5. Return signed URL

- **Retrieval Flow**:
  1. Get image ID from image_entity
  2. Get filename from images table
  3. Generate signed URL (24h expiry)
  4. Return URL

### 5. Review Management
- **Add Review**:
  1. Validate customer has purchased product
  2. Check if review already exists
  3. Insert review record
  4. Update product rating

- **Edit/Delete Review**:
  1. Validate ownership
  2. Update/delete record
  3. Recalculate product rating

---

## API Endpoints (Supabase)

All API calls go through Supabase client:

### Authentication
- `supabase.auth.signInWithPassword()`
- `supabase.auth.signOut()`
- `supabase.auth.getUser()`
- `supabase.auth.refreshSession()`
- `supabase.auth.setSession()`
- `supabase.auth.onAuthStateChange`

### Database
- `supabase.from(table).select()`
- `supabase.from(table).insert()`
- `supabase.from(table).update()`
- `supabase.from(table).delete()`
- `supabase.from(table).eq()`
- `supabase.from(table).filter()`
- `supabase.from(table).order()`
- `supabase.from(table).limit()`
- `supabase.from(table).range()`

### Storage
- `supabase.storage.from(bucket).upload()`
- `supabase.storage.from(bucket).getPublicUrl()`
- `supabase.storage.from(bucket).createSignedUrl()`
- `supabase.storage.from(bucket).remove()`

### RPC (Remote Procedure Calls)
- `supabase.rpc(functionName, params: {...})`

---

## Environment Configuration

### Required Environment Variables
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Configuration
- **Auth**: Email/Password + OAuth (Google)
- **Storage Buckets**:
  - `products`
  - `brands`
  - `categories`
  - `customers`
- **RLS**: Enabled on all tables
- **Realtime**: Available for order updates (optional)

---

## Testing Recommendations

### 1. Unit Tests
- Repository methods
- Model serialization/deserialization
- Validation logic

### 2. Integration Tests
- Authentication flow
- Cart operations
- Order creation
- Image upload/retrieval

### 3. E2E Tests
- Complete user journey
- Checkout flow
- Profile management

---

## Future Enhancements

### 1. Realtime Features
- Live order status updates
- Real-time stock updates
- Live chat support

### 2. Analytics
- User behavior tracking
- Product view analytics
- Conversion tracking

### 3. Payment Integration
- Stripe/PayPal integration
- Multiple payment methods
- Payment webhooks

### 4. Advanced Search
- Full-text search
- Filters (price range, ratings, etc.)
- Sort options

### 5. Notifications
- Order status notifications
- Promotional notifications
- Abandoned cart reminders

---

## Conclusion

This backend architecture provides a robust, scalable foundation for the e-commerce application. The use of Supabase simplifies backend management while providing enterprise-grade features like authentication, database, and storage. The repository pattern ensures clean separation of concerns and makes the codebase maintainable and testable.

**Key Strengths**:
- Clean architecture with repository pattern
- Comprehensive error handling
- Performance optimizations (caching, pagination, batch operations)
- Security best practices (RLS, token management, secure storage)
- Scalable design

**Maintenance Notes**:
- Monitor cache hit rates and adjust expiry times
- Review database indexes periodically
- Update RLS policies as needed
- Keep Supabase SDK updated
- Monitor storage usage and implement cleanup policies
