import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockImageEntity } from '../../helpers/factories';

const mockUploadStream = vi.fn();
const mockUpload = vi.fn();
const mockDestroy = vi.fn();
const mockDeleteResources = vi.fn();

const mockImageCreate = vi.fn();
const mockImageDelete = vi.fn();
const mockImageDeleteMany = vi.fn();
const mockImageEntityFindFirst = vi.fn();
const mockImageEntityFindMany = vi.fn();
const mockImageEntityFindUnique = vi.fn();
const mockImageEntityCreate = vi.fn();
const mockImageEntityUpdate = vi.fn();
const mockImageEntityUpdateMany = vi.fn();

vi.mock('../../../src/config/cloudinary.config', () => ({
  cloudinary: {
    uploader: {
      upload_stream: mockUploadStream,
      upload: mockUpload,
      destroy: mockDestroy,
    },
    api: {
      delete_resources: mockDeleteResources,
    },
  },
  CLOUDINARY_FOLDERS: { products: 'products', brands: 'brands', categories: 'categories', customers: 'customers', misc: 'misc' },
  UPLOAD_PRESETS: {
    product: { transformation: {}, format: 'webp' },
    brand: { transformation: {}, format: 'webp' },
    category: { transformation: {}, format: 'webp' },
    profile: { transformation: {}, format: 'webp' },
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

    mockUploadStream.mockImplementation((_opts: unknown, cb: (err: null, result: object) => void) => ({
      end: () =>
        cb(null, {
          secure_url: 'https://res.cloudinary.com/test/image.jpg',
          public_id: 'products_1_123',
          width: 800,
          height: 600,
        }),
    }));

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

    expect(result.url).toContain('cloudinary.com');
    expect(result.imageId).toBe(1);
    expect(mockImageCreate).toHaveBeenCalled();
    expect(mockImageEntityCreate).toHaveBeenCalled();
  });

  it('uploads image from URL', async () => {
    mockUpload.mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test/profile.jpg',
      public_id: 'customers_1_123',
      width: 200,
      height: 200,
    });

    const { imageService } = await import('../../../src/services/image.service');
    const result = await imageService.uploadFromUrl(
      'https://example.com/profile.jpg',
      'customers',
      1
    );

    expect(result.publicId).toBe('customers_1_123');
  });

  it('returns main image URL from database', async () => {
    mockImageEntityFindFirst.mockResolvedValue(mockImageEntity);

    const { imageService } = await import('../../../src/services/image.service');
    const url = await imageService.getMainImageUrl(1, 'products');

    expect(url).toBe('https://res.cloudinary.com/test/image.jpg');
  });

  it('returns null when no featured image exists', async () => {
    mockImageEntityFindFirst.mockResolvedValue(null);

    const { imageService } = await import('../../../src/services/image.service');
    const url = await imageService.getMainImageUrl(999, 'products');

    expect(url).toBeNull();
  });

  it('gets all images for entity', async () => {
    mockImageEntityFindMany.mockResolvedValue([mockImageEntity]);

    const { imageService } = await import('../../../src/services/image.service');
    const urls = await imageService.getAllImagesForEntity(1, 'products');

    expect(urls).toHaveLength(1);
  });

  it('deletes main image from cloudinary and database', async () => {
    mockImageEntityFindFirst.mockResolvedValue(mockImageEntity);
    mockDestroy.mockResolvedValue({ result: 'ok' });
    mockImageDelete.mockResolvedValue(mockImageEntity.image);

    const { imageService } = await import('../../../src/services/image.service');
    const result = await imageService.deleteMainImage(1, 'products');

    expect(result).toBe(true);
    expect(mockDestroy).toHaveBeenCalled();
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
