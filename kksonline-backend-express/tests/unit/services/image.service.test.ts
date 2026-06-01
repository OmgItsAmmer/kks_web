import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabaseImageEntity } from '../../helpers/factories';

const mockStorageUpload = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  upload: mockStorageUpload,
  remove: mockStorageRemove,
  createSignedUrl: vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://test-project.supabase.co/storage/v1/object/sign/customers/profile.jpg' },
    error: null,
  }),
  list: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

const mockGetSupabasePublicUrl = vi.fn();

const mockImageCreate = vi.fn();
const mockImageDelete = vi.fn();
const mockImageDeleteMany = vi.fn();
const mockImageEntityFindFirst = vi.fn();
const mockImageEntityFindMany = vi.fn();
const mockImageEntityFindUnique = vi.fn();
const mockImageEntityCreate = vi.fn();
const mockImageEntityUpdate = vi.fn();
const mockImageEntityUpdateMany = vi.fn();

vi.mock('../../../src/config/supabase.config', () => ({
  getSupabasePublicUrl: mockGetSupabasePublicUrl,
  SUPABASE_BUCKETS: {
    products: 'products',
    vendors: 'vendors',
    guarantors: 'guarantors',
    salesman: 'salesman',
    users: 'users',
    customers: 'customers',
    brands: 'brands',
    categories: 'categories',
    shop: 'shop',
    collections: 'collections',
    paymentReceipts: 'payment-receipts',
  },
  supabase: {
    storage: {
      from: mockStorageFrom,
    },
  },
}));

vi.mock('../../../src/config/database.config', () => ({
  db: {
    image: {
      create: mockImageCreate,
      delete: mockImageDelete,
      deleteMany: mockImageDeleteMany,
    },
    imageEntity: {
      findFirst: mockImageEntityFindFirst,
      findMany: mockImageEntityFindMany,
      findUnique: mockImageEntityFindUnique,
      create: mockImageEntityCreate,
      update: mockImageEntityUpdate,
      updateMany: mockImageEntityUpdateMany,
    },
  },
}));

vi.mock('../../../src/utils/cache', () => ({
  CacheKeys: { PRODUCT_IMAGES: 'product_images' },
  generateCacheKey: vi.fn((key: string) => key),
  getFromCache: vi.fn(() => undefined),
  setInCache: vi.fn(),
  deleteByPattern: vi.fn(),
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('ImageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });
    mockGetSupabasePublicUrl.mockImplementation(
      (bucket: string, filePath: string) =>
        `https://test-project.supabase.co/storage/v1/object/public/${bucket}/${filePath}`
    );

    mockImageCreate.mockResolvedValue({ image_id: 1 });
    mockImageEntityUpdateMany.mockResolvedValue({ count: 0 });
    mockImageEntityCreate.mockResolvedValue({ image_entity_id: 1 });
  });

  it('uploads image from buffer and saves to database', async () => {
    const { imageService } = await import('../../../src/services/image.service');
    const result = await imageService.uploadFromBuffer(
      Buffer.from('fake-image'),
      'products',
      1,
      true,
      'rice.jpg'
    );

    expect(result.url).toContain('supabase.co');
    expect(result.imageId).toBe(1);
    expect(mockImageCreate).toHaveBeenCalled();
    expect(mockImageEntityCreate).toHaveBeenCalled();
    expect(mockStorageUpload).toHaveBeenCalled();
  });

  it('uploads image from URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        headers: { get: () => 'image/jpeg' },
      })
    );

    const { imageService } = await import('../../../src/services/image.service');
    const result = await imageService.uploadFromUrl(
      'https://example.com/profile.jpg',
      'customers',
      1
    );

    expect(result.url).toContain('supabase.co');
    expect(result.imageId).toBe(1);

    vi.unstubAllGlobals();
  });

  it('returns main image URL from database', async () => {
    mockImageEntityFindFirst.mockResolvedValue(mockSupabaseImageEntity);

    const { imageService } = await import('../../../src/services/image.service');
    const url = await imageService.getMainImageUrl(1, 'products');

    expect(url).toBe('https://test-project.supabase.co/storage/v1/object/public/products/rice-5kg.jpg');
    expect(mockGetSupabasePublicUrl).toHaveBeenCalledWith('products', 'rice-5kg.jpg');
  });

  it('returns null when no featured image exists', async () => {
    mockImageEntityFindFirst.mockResolvedValue(null);

    const { imageService } = await import('../../../src/services/image.service');
    const url = await imageService.getMainImageUrl(999, 'products');

    expect(url).toBeNull();
  });

  it('gets all images for entity', async () => {
    mockImageEntityFindMany.mockResolvedValue([mockSupabaseImageEntity]);

    const { imageService } = await import('../../../src/services/image.service');
    const urls = await imageService.getAllImagesForEntity(1, 'products');

    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('supabase.co');
  });

  it('deletes main image from Supabase storage and database', async () => {
    mockImageEntityFindFirst.mockResolvedValue({
      ...mockSupabaseImageEntity,
      image: {
        image_id: 1,
        filename: 'rice-5kg.jpg',
        folderType: 'products',
      },
    });
    mockImageDelete.mockResolvedValue(mockSupabaseImageEntity.image);

    const { imageService } = await import('../../../src/services/image.service');
    const result = await imageService.deleteMainImage(1, 'products');

    expect(result).toBe(true);
    expect(mockStorageRemove).toHaveBeenCalled();
  });

  it('returns false when deleting missing image', async () => {
    mockImageEntityFindUnique.mockResolvedValue(null);

    const { imageService } = await import('../../../src/services/image.service');
    const result = await imageService.deleteImage(999);

    expect(result).toBe(false);
  });

  it('sets featured image', async () => {
    mockImageEntityUpdateMany.mockResolvedValue({ count: 1 });
    mockImageEntityUpdate.mockResolvedValue({ image_entity_id: 2, isFeatured: true });

    const { imageService } = await import('../../../src/services/image.service');
    const result = await imageService.setFeaturedImage(2, 1, 'products');

    expect(result).toBe(true);
    expect(mockImageEntityUpdateMany).toHaveBeenCalled();
  });
});
