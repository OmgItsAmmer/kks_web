export type EntityCategory = 'products' | 'brands' | 'categories' | 'customers';
export interface ImageUploadResponse {
    imageId: number;
    url: string;
    publicId: string;
    width: number;
    height: number;
}
export declare class ImageService {
    /**
     * Upload image from buffer (for multipart uploads)
     */
    uploadFromBuffer(buffer: Buffer, entityCategory: EntityCategory, entityId: number, isFeatured?: boolean, filename?: string): Promise<ImageUploadResponse>;
    /**
     * Upload image from URL (e.g., Google profile picture)
     */
    uploadFromUrl(imageUrl: string, entityCategory: EntityCategory, entityId: number, isFeatured?: boolean): Promise<ImageUploadResponse>;
    /**
     * Get featured/main image URL for an entity
     */
    getMainImageUrl(entityId: number, entityCategory: EntityCategory): Promise<string | null>;
    /**
     * Get all image URLs for an entity
     */
    getAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<string[]>;
    /**
     * Get main images for multiple entities (batch operation)
     */
    getMainImagesForEntities(entityIds: number[], entityCategory: EntityCategory): Promise<Map<number, string>>;
    /**
     * Update/replace main image for an entity
     */
    updateMainImage(buffer: Buffer, entityCategory: EntityCategory, entityId: number, filename?: string): Promise<ImageUploadResponse>;
    /**
     * Delete main/featured image for an entity
     */
    deleteMainImage(entityId: number, entityCategory: EntityCategory): Promise<boolean>;
    /**
     * Delete all images for an entity
     */
    deleteAllImagesForEntity(entityId: number, entityCategory: EntityCategory): Promise<boolean>;
    /**
     * Set an existing image as featured
     */
    setFeaturedImage(imageEntityId: number, entityId: number, entityCategory: EntityCategory): Promise<boolean>;
    /**
     * Delete a specific image by image_entity_id
     */
    deleteImage(imageEntityId: number): Promise<boolean>;
    /**
     * Add additional image (not featured) to an entity
     */
    addImage(buffer: Buffer, entityCategory: EntityCategory, entityId: number, filename?: string): Promise<ImageUploadResponse>;
    private getPresetForEntity;
    private saveImageToDatabase;
    private invalidateImageCache;
}
export declare const imageService: ImageService;
//# sourceMappingURL=image.service.d.ts.map