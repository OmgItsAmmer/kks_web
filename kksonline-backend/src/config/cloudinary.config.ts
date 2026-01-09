import { v2 as cloudinary } from 'cloudinary';
import { config } from "./env.config.ts";

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export { cloudinary };

// Folder structure for different entity types
export const CLOUDINARY_FOLDERS = {
  products: 'kksonline/products',
  brands: 'kksonline/brands',
  categories: 'kksonline/categories',
  customers: 'kksonline/customers',
  banners: 'kksonline/banners',
  misc: 'kksonline/misc',
} as const;

export type CloudinaryFolder = keyof typeof CLOUDINARY_FOLDERS;

// Upload options for different use cases
export const UPLOAD_PRESETS = {
  product: {
    folder: CLOUDINARY_FOLDERS.products,
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
    ],
    format: 'webp',
  },
  thumbnail: {
    folder: CLOUDINARY_FOLDERS.products,
    transformation: [
      { width: 200, height: 200, crop: 'fill', quality: 'auto:eco' },
    ],
    format: 'webp',
  },
  brand: {
    folder: CLOUDINARY_FOLDERS.brands,
    transformation: [
      { width: 400, height: 400, crop: 'limit', quality: 'auto:good' },
    ],
    format: 'webp',
  },
  category: {
    folder: CLOUDINARY_FOLDERS.categories,
    transformation: [
      { width: 600, height: 400, crop: 'fill', quality: 'auto:good' },
    ],
    format: 'webp',
  },
  profile: {
    folder: CLOUDINARY_FOLDERS.customers,
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto:good' },
    ],
    format: 'webp',
  },
} as const;

