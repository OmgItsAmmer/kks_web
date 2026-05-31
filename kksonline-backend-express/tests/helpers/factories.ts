import type { Product, ProductVariant } from '@prisma/client';

export const mockCustomer = {
  customer_id: 1,
  phone_number: '03001234567',
  first_name: 'Ali',
  last_name: 'Khan',
  cnic: '',
  email: 'ali@example.com',
  created_at: new Date(),
  dob: null,
  gender: null,
  auth_uid: 'google-uid-123',
  fcm_token: null,
};

export const mockProduct: Product = {
  product_id: 1,
  name: 'Basmati Rice 5kg',
  description: 'Premium karyana staple',
  base_price: '1200',
  sale_price: '1150',
  ispopular: true,
  stock_quantity: 50,
  alert_stock: 5,
  isVisible: true,
  tag: 'RECOMMENDED',
  price_range: '1150',
  category_id: 1,
  brandID: 1,
  created_at: new Date(),
  updated_at: new Date(),
};

export const mockVariant: ProductVariant = {
  variant_id: 1,
  product_id: 1,
  variant_name: '5kg Bag',
  buy_price: 1000,
  sell_price: 1150,
  stock: 50,
  sku: 'RICE-5KG',
  is_visible: true,
  alert_stock: 5,
  created_at: new Date(),
  updated_at: new Date(),
};

export const mockCategory = {
  category_id: 1,
  category_name: 'Rice & Pulses',
  isFeatured: true,
  created_at: new Date(),
};

export const mockBrand = {
  brandID: 1,
  brandname: 'National Foods',
  isVerified: true,
  isFeatured: true,
  created_at: new Date(),
};

export const mockImageEntity = {
  image_entity_id: 1,
  entity_id: 1,
  entity_category: 'products',
  isFeatured: true,
  created_at: new Date(),
  image: {
    image_id: 1,
    filename: 'products_1_test.jpg',
    image_url: 'https://res.cloudinary.com/test/image.jpg',
    folderType: 'products',
  },
};

export const mockSupabaseImageEntity = {
  image_entity_id: 1,
  entity_id: 1,
  entity_category: 'products',
  isFeatured: true,
  created_at: new Date(),
  image: {
    filename: 'rice-5kg.jpg',
    folderType: 'products',
  },
};
