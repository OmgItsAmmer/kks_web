import { createClient } from '@supabase/supabase-js';
import { S3Client } from '@aws-sdk/client-s3';
import { config } from './env.config.ts';
import { logger } from '../utils/logger.ts';

// Supabase configuration
const supabaseUrl = config.supabase.url;
const supabaseServiceKey = config.supabase.serviceKey;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Supabase configuration missing. Storage features will not work properly.');
  logger.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Extract project reference from Supabase URL
// Format: https://[project-ref].supabase.co
const getProjectRef = (url: string): string | null => {
  try {
    const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const projectRef = getProjectRef(supabaseUrl);

// Create S3 client for Supabase Storage (if credentials provided)
let s3Client: S3Client | null = null;

if (config.supabase.s3.endpoint && config.supabase.s3.accessKeyId && config.supabase.s3.secretAccessKey) {
  s3Client = new S3Client({
    endpoint: config.supabase.s3.endpoint,
    region: config.supabase.s3.region,
    credentials: {
      accessKeyId: config.supabase.s3.accessKeyId,
      secretAccessKey: config.supabase.s3.secretAccessKey,
    },
    forcePathStyle: true, // Required for Supabase S3
  });
  logger.info('S3 client initialized for Supabase Storage');
} else {
  logger.warn('S3 credentials not provided. Using public URL method only.');
}

// Bucket names from schema
export const SUPABASE_BUCKETS = {
  products: 'products',
  vendors: 'vendors',
  guarantors: 'guarantors',
  salesman: 'salesman',
  users: 'users',
  customers: 'customers',
  brands: 'brands',
  categories: 'categories',
  shop: 'shop',
} as const;

/**
 * Get public URL for a file in Supabase Storage using S3 protocol endpoint
 * This constructs the URL directly using the S3 endpoint format
 */
export function getSupabasePublicUrl(bucket: string, filePath: string): string {
  // IMPORTANT: S3 endpoint uses .storage.supabase.co but PUBLIC URLs use .supabase.co
  // S3 API: https://[project].storage.supabase.co/storage/v1/s3
  // Public URL: https://[project].supabase.co/storage/v1/object/public/[bucket]/[file]
  
  // Always use the main Supabase URL (not the S3 endpoint) for public URLs
  if (projectRef) {
    // Ensure filePath doesn't have leading slash
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    // URL encode the path but preserve forward slashes
    const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');
    // Use the main domain (without .storage.)
    const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${encodedPath}`;
    logger.debug(`[Supabase] Generated public URL: ${publicUrl}`);
    return publicUrl;
  }
  
  // Fallback to Supabase JS client method
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    logger.debug(`[Supabase] Generated public URL using Supabase client: ${data.publicUrl}`);
    return data.publicUrl;
  } catch (error) {
    logger.error('Error generating public URL with Supabase client', { error, bucket, filePath });
    throw new Error('Unable to generate Supabase public URL');
  }
}

/**
 * Generate Supabase storage URL from image record
 * Assumes images are stored with pattern: {bucket}/{filename}
 */
export function generateImageUrl(folderType: string | null, filename: string | null): string | null {
  if (!folderType || !filename) {
    return null;
  }

  try {
    return getSupabasePublicUrl(folderType, filename);
  } catch (error) {
    logger.error('Error generating Supabase URL', { error, folderType, filename });
    return null;
  }
}

// Export S3 client if available
export { s3Client };

export default supabase;
