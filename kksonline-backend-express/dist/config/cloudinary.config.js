"use strict";
/**
 * Cloudinary is temporarily disabled. All image I/O uses Supabase Storage.
 * This module remains only so legacy imports fail loudly instead of initializing Cloudinary.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_PRESETS = exports.CLOUDINARY_FOLDERS = exports.cloudinary = exports.CLOUDINARY_DISABLED = void 0;
exports.CLOUDINARY_DISABLED = true;
const disabled = () => {
    throw new Error('Cloudinary is temporarily disabled. Use Supabase Storage via supabase-image.service instead.');
};
exports.cloudinary = {
    uploader: {
        upload_stream: disabled,
        upload: disabled,
        destroy: disabled,
    },
    api: {
        delete_resources: disabled,
    },
};
exports.CLOUDINARY_FOLDERS = {};
exports.UPLOAD_PRESETS = {};
//# sourceMappingURL=cloudinary.config.js.map