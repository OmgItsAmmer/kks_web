import { S3Client } from '@aws-sdk/client-s3';
export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
declare let s3Client: S3Client | null;
export declare const SUPABASE_BUCKETS: {
    readonly products: "products";
    readonly vendors: "vendors";
    readonly guarantors: "guarantors";
    readonly salesman: "salesman";
    readonly users: "users";
    readonly customers: "customers";
    readonly brands: "brands";
    readonly categories: "categories";
    readonly shop: "shop";
    readonly collections: "collections";
    readonly paymentReceipts: "payment-receipts";
};
/**
 * Get public URL for a file in Supabase Storage using S3 protocol endpoint
 * This constructs the URL directly using the S3 endpoint format
 */
export declare function getSupabasePublicUrl(bucket: string, filePath: string): string;
/**
 * Generate Supabase storage URL from image record
 * Assumes images are stored with pattern: {bucket}/{filename}
 */
export declare function generateImageUrl(folderType: string | null, filename: string | null): string | null;
export { s3Client };
export default supabase;
//# sourceMappingURL=supabase.config.d.ts.map