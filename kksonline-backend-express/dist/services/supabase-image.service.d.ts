export type EntityCategory = 'products' | 'brands' | 'categories' | 'customers' | 'vendors' | 'salesman' | 'shop' | 'collections';
export interface ImageUploadResponse {
    imageId: number;
    url: string;
    publicId: string;
    width: number;
    height: number;
}
export interface PaymentReceiptUploadResult {
    receiptPath: string;
    receiptUrl: string;
}
/**
 * Unified Supabase Storage image service (catalog images + payment receipts).
 * Cloudinary is disabled; all uploads and reads go through Supabase.
 */
export declare class SupabaseImageService {
    getMainImageUrl(entityId: number, entityCategory: EntityCategory): Promise<string | null>;
    getAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<string[]>;
    getMainImagesForEntities(entityIds: number[], entityCategory: EntityCategory): Promise<Map<number, string>>;
    uploadFromBuffer(buffer: Buffer, entityCategory: EntityCategory, entityId: number, isFeatured?: boolean, filename?: string, mimeType?: string): Promise<ImageUploadResponse>;
    uploadFromUrl(imageUrl: string, entityCategory: EntityCategory, entityId: number, isFeatured?: boolean): Promise<ImageUploadResponse>;
    updateMainImage(buffer: Buffer, entityCategory: EntityCategory, entityId: number, filename?: string, mimeType?: string): Promise<ImageUploadResponse>;
    deleteMainImage(entityId: number, entityCategory: EntityCategory): Promise<boolean>;
    deleteAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<boolean>;
    setFeaturedImage(imageEntityId: number, entityId: number, entityCategory: EntityCategory): Promise<boolean>;
    deleteImage(imageEntityId: number): Promise<boolean>;
    addImage(buffer: Buffer, entityCategory: EntityCategory, entityId: number, filename?: string, mimeType?: string): Promise<ImageUploadResponse>;
    private assertReceiptFeatureEnabled;
    uploadReceipt(customerId: number, buffer: Buffer, mimeType: string, originalFilename?: string): Promise<PaymentReceiptUploadResult>;
    verifyReceiptOwnership(customerId: number, receiptPath: string): Promise<boolean>;
    createReceiptSignedUrl(receiptPath: string): Promise<string>;
    isValidReceiptPath(customerId: number, receiptPath: string): boolean;
    private getBucketForEntity;
    private resolveImageUrl;
    private deleteFromStorage;
    private saveImageToDatabase;
    private getExtension;
    private invalidateImageCache;
}
export declare const supabaseImageService: SupabaseImageService;
//# sourceMappingURL=supabase-image.service.d.ts.map