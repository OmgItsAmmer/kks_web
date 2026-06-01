/**
 * Cloudinary is temporarily disabled. All image I/O uses Supabase Storage.
 * This module remains only so legacy imports fail loudly instead of initializing Cloudinary.
 */

export const CLOUDINARY_DISABLED = true;

const disabled = (): never => {
  throw new Error('Cloudinary is temporarily disabled. Use Supabase Storage via supabase-image.service instead.');
};

export const cloudinary = {
  uploader: {
    upload_stream: disabled,
    upload: disabled,
    destroy: disabled,
  },
  api: {
    delete_resources: disabled,
  },
};

export const CLOUDINARY_FOLDERS = {} as const;
export const UPLOAD_PRESETS = {} as const;
