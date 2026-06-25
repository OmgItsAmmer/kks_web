/**
 * Cloudinary is temporarily disabled. All image I/O uses Supabase Storage.
 * This module remains only so legacy imports fail loudly instead of initializing Cloudinary.
 */
export declare const CLOUDINARY_DISABLED = true;
export declare const cloudinary: {
    uploader: {
        upload_stream: () => never;
        upload: () => never;
        destroy: () => never;
    };
    api: {
        delete_resources: () => never;
    };
};
export declare const CLOUDINARY_FOLDERS: {};
export declare const UPLOAD_PRESETS: {};
//# sourceMappingURL=cloudinary.config.d.ts.map