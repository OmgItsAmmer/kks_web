# Product Image Flow: Frontend ↔ Backend ↔ Database

## Overview
Product images are stored in **Supabase Storage** (cloud), with metadata in **PostgreSQL database**, and served to the **React frontend** via REST API endpoints.

---

## Architecture Flow

```
Frontend (React) → Backend API (Express) → Database (PostgreSQL) → Supabase Storage
     ↑                                                                    ↓
     └────────────────────── Image URLs ────────────────────────────────┘
```

---

## Database Schema

### Tables
1. **`images`** - Stores image metadata
   - `image_id` (PK)
   - `filename` - Filename in Supabase Storage
   - `folderType` - Bucket name (e.g., 'products')
   - `image_url` - Legacy field (not used for Supabase)

2. **`image_entity`** - Links images to products
   - `image_entity_id` (PK)
   - `image_id` (FK → images)
   - `entity_id` - Product ID
   - `entity_category` - 'products'
   - `isFeatured` - Marks main/featured image

---

## Backend Flow

### 1. Image Service (`supabase-image.service.ts`)
- Queries `image_entity` table to find images for a product
- Retrieves `filename` and `folderType` from `images` table
- Generates Supabase public URL using `getSupabasePublicUrl(bucket, filename)`
- Returns URL string (e.g., `https://[project].supabase.co/storage/v1/object/public/products/image.jpg`)

### 2. Product Routes (`product.routes.ts`)
**List Products (`GET /api/v1/products`)**:
- Fetches products from database
- Batch fetches main images: `getMainImagesForEntities(productIds, 'products')`
- Attaches `mainImage` URL to each product in response

**Product Details (`GET /api/v1/products/:id`)**:
- Fetches product with details
- Gets all images: `getAllImagesForEntity(productId, 'products')`
- Returns product with `images[]` and `mainImage` fields

**Product Images (`GET /api/v1/products/:id/images`)**:
- Returns array of all image URLs for a product

### 3. Supabase Config (`supabase.config.ts`)
- Generates public URLs: `supabase.storage.from(bucket).getPublicUrl(filePath)`
- Buckets: `products`, `brands`, `categories`, etc.

---

## Frontend Flow

### 1. Product Service (`product.service.ts`)
- Makes HTTP requests to backend API
- `getProducts()` → Returns products with `mainImage` field
- `getProductById()` → Returns product with `images[]` and `mainImage`
- `getProductImages(id)` → Returns array of image URLs

### 2. React Hooks (`useProducts.ts`)
- Uses React Query for caching
- `useProductDetails()` - Fetches product with details
- `useProductImages()` - Fetches all images for a product
- Caching: 10min stale time, 30min garbage collection

### 3. Components

**ProductCard** (Product List):
```tsx
<img src={product.image || logo} alt={product.name} />
```
- Uses `mainImage` from product data
- Fallback to `/logo.png` if missing

**ProductDetail** (Product Page):
```tsx
const images = useMemo(() => {
  if (!imagesData || imagesData.length === 0) return [logo];
  return imagesData;
}, [imagesData]);
```
- Fetches all images separately via `useProductImages()`
- Displays image gallery with fallback

---

## Data Flow Example

### Scenario: Displaying product list

1. **Frontend**: `GET /api/v1/products`
2. **Backend Route**: Queries products from database
3. **Backend Service**: 
   - Extracts product IDs: `[1, 2, 3]`
   - Calls `getMainImagesForEntities([1,2,3], 'products')`
4. **Database Query**:
   ```sql
   SELECT image_entity.*, images.filename, images.folderType
   FROM image_entity
   JOIN images ON image_entity.image_id = images.image_id
   WHERE entity_id IN (1,2,3) 
     AND entity_category = 'products' 
     AND isFeatured = true
   ```
5. **Supabase URL Generation**:
   - For each image: `getSupabasePublicUrl('products', 'image123.jpg')`
   - Returns: `https://xxx.supabase.co/storage/v1/object/public/products/image123.jpg`
6. **Backend Response**:
   ```json
   {
     "data": [
       {
         "product_id": 1,
         "name": "Product 1",
         "mainImage": "https://xxx.supabase.co/.../image123.jpg"
       }
     ]
   }
   ```
7. **Frontend**: Renders `<img src={product.mainImage} />`
8. **Browser**: Directly fetches image from Supabase CDN

---

## Key Points

- **Storage**: Images stored in Supabase Storage buckets (cloud CDN)
- **Database**: Only metadata stored (filename, bucket name)
- **URLs**: Generated dynamically from database metadata
- **Performance**: Batch fetching for product lists, direct CDN access for images
- **Fallback**: Frontend uses `/logo.png` if image missing
- **Caching**: React Query caches API responses, browser caches images

---

## Image Upload Flow (Not covered in detail)

When uploading:
1. Image uploaded to Supabase Storage bucket
2. Record created in `images` table with `filename` and `folderType`
3. Link created in `image_entity` table with `isFeatured` flag
4. URL generated and returned to client
