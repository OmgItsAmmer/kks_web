import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTestAgent, resetTestApp } from '../helpers/test-app';
import { mockProduct } from '../helpers/factories';

const mockSearch = vi.fn();
const mockFindPopular = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdWithDetails = vi.fn();
const mockGetCount = vi.fn();
const mockGetMainImagesForEntities = vi.fn();

vi.mock('../../src/repositories/product.repository', () => ({
  productRepository: {
    search: mockSearch,
    findPopular: mockFindPopular,
    findById: mockFindById,
    findByIdWithDetails: mockFindByIdWithDetails,
    getCount: mockGetCount,
    getVisibleVariants: vi.fn(),
    getSearchSuggestions: vi.fn().mockResolvedValue([]),
    findByCategory: vi.fn(),
    findByBrand: vi.fn(),
    getVariants: vi.fn(),
  },
}));

vi.mock('../../src/services/supabase-image.service', () => ({
  supabaseImageService: {
    getMainImagesForEntities: mockGetMainImagesForEntities,
    getMainImageUrl: vi.fn().mockResolvedValue(null),
    getAllImagesForEntity: vi.fn().mockResolvedValue([]),
  },
}));

describe('Products integration', () => {
  beforeEach(() => {
    resetTestApp();
    vi.clearAllMocks();
    mockGetMainImagesForEntities.mockResolvedValue(new Map([[1, 'https://example.com/rice.jpg']]));
    mockGetCount.mockResolvedValue(1);
  });

  it('GET /api/v1/products returns paginated products', async () => {
    mockSearch.mockResolvedValue({ products: [mockProduct], total: 1 });
    const agent = await getTestAgent();

    const response = await agent.get('/api/v1/products?page=1&pageSize=10');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].mainImage).toBe('https://example.com/rice.jpg');
  });

  it('GET /api/v1/products/popular returns popular products', async () => {
    mockFindPopular.mockResolvedValue([mockProduct]);
    const agent = await getTestAgent();

    const response = await agent.get('/api/v1/products/popular');

    expect(response.status).toBe(200);
    expect(response.body.data[0].name).toBe('Basmati Rice 5kg');
  });

  it('GET /api/v1/products/:id returns 404 for missing product', async () => {
    mockFindByIdWithDetails.mockResolvedValue(null);
    const agent = await getTestAgent();

    const response = await agent.get('/api/v1/products/99999');

    expect(response.status).toBe(404);
  });
});
