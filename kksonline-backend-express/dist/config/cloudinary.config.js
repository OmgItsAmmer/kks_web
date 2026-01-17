"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_PRESETS = exports.CLOUDINARY_FOLDERS = exports.cloudinary = void 0;
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
const env_config_ts_1 = require("./env.config.ts");
cloudinary_1.v2.config({
    cloud_name: env_config_ts_1.config.cloudinary.cloudName,
    api_key: env_config_ts_1.config.cloudinary.apiKey,
    api_secret: env_config_ts_1.config.cloudinary.apiSecret,
    secure: true,
});
// Folder structure for different entity types
exports.CLOUDINARY_FOLDERS = {
    products: 'kksonline/products',
    brands: 'kksonline/brands',
    categories: 'kksonline/categories',
    customers: 'kksonline/customers',
    banners: 'kksonline/banners',
    misc: 'kksonline/misc',
};
// Upload options for different use cases
exports.UPLOAD_PRESETS = {
    product: {
        folder: exports.CLOUDINARY_FOLDERS.products,
        transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
        ],
        format: 'webp',
    },
    thumbnail: {
        folder: exports.CLOUDINARY_FOLDERS.products,
        transformation: [
            { width: 200, height: 200, crop: 'fill', quality: 'auto:eco' },
        ],
        format: 'webp',
    },
    brand: {
        folder: exports.CLOUDINARY_FOLDERS.brands,
        transformation: [
            { width: 400, height: 400, crop: 'limit', quality: 'auto:good' },
        ],
        format: 'webp',
    },
    category: {
        folder: exports.CLOUDINARY_FOLDERS.categories,
        transformation: [
            { width: 600, height: 400, crop: 'fill', quality: 'auto:good' },
        ],
        format: 'webp',
    },
    profile: {
        folder: exports.CLOUDINARY_FOLDERS.customers,
        transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto:good' },
        ],
        format: 'webp',
    },
};
//# sourceMappingURL=cloudinary.config.js.map