import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabaseImageEntity } from '../../helpers/factories';

const mockImageEntityFindFirst = vi.fn();
const mockImageEntityFindMany = vi.fn();
const mockGetSupabasePublicUrl = vi.fn();

vi.mock('../../../src/config/database.config', () => ({
  db: {
    imageEntity: {
      findFirst: mockImageEntityFindFirst,
      findMany: mockImageEntityFindMany,
    },
  },
}));

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
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/receipt' }, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('SupabaseImageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSupabasePublicUrl.mockReturnValue(
      'https://test-project.supabase.co/storage/v1/object/public/products/rice-5kg.jpg'
    );
  });

  it('returns Supabase public URL for main image', async () => {
    mockImageEntityFindFirst.mockResolvedValue(mockSupabaseImageEntity);

    const { supabaseImageService } = await import('../../../src/services/supabase-image.service');
    const url = await supabaseImageService.getMainImageUrl(1, 'products');

    expect(url).toContain('supabase.co');
    expect(mockGetSupabasePublicUrl).toHaveBeenCalledWith('products', 'rice-5kg.jpg');
  });

  it('returns null when no image record exists', async () => {
    mockImageEntityFindFirst.mockResolvedValue(null);

    const { supabaseImageService } = await import('../../../src/services/supabase-image.service');
    const url = await supabaseImageService.getMainImageUrl(999, 'products');

    expect(url).toBeNull();
  });

  it('returns null when Supabase fields are missing', async () => {
    mockImageEntityFindFirst.mockResolvedValue({
      ...mockSupabaseImageEntity,
      image: { filename: null, folderType: null },
    });

    const { supabaseImageService } = await import('../../../src/services/supabase-image.service');
    const url = await supabaseImageService.getMainImageUrl(1, 'products');

    expect(url).toBeNull();
  });

  it('returns all image URLs for entity', async () => {
    mockImageEntityFindMany.mockResolvedValue([mockSupabaseImageEntity]);

    const { supabaseImageService } = await import('../../../src/services/supabase-image.service');
    const urls = await supabaseImageService.getAllImagesForEntity(1, 'products');

    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('supabase.co');
  });

  it('batch fetches main images for multiple entities', async () => {
    mockImageEntityFindMany.mockResolvedValue([
      { ...mockSupabaseImageEntity, entity_id: 1 },
      { ...mockSupabaseImageEntity, entity_id: 2, image_entity_id: 2 },
    ]);

    const { supabaseImageService } = await import('../../../src/services/supabase-image.service');
    const map = await supabaseImageService.getMainImagesForEntities([1, 2], 'products');

    expect(map.size).toBe(2);
    expect(map.get(1)).toContain('supabase.co');
    expect(map.get(2)).toContain('supabase.co');
  });

  it('returns empty map on database error', async () => {
    mockImageEntityFindMany.mockRejectedValue(new Error('DB down'));

    const { supabaseImageService } = await import('../../../src/services/supabase-image.service');
    const map = await supabaseImageService.getMainImagesForEntities([1], 'products');

    expect(map.size).toBe(0);
  });
});
