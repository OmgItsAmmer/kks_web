import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTestAgent, resetTestApp } from '../helpers/test-app';
import { mockCategory, mockBrand } from '../helpers/factories';

const mockCategoryFindAll = vi.fn();
const mockCategoryFindFeatured = vi.fn();
const mockCategoryFindById = vi.fn();
const mockCategoryCreate = vi.fn();
const mockCategoryUpdate = vi.fn();
const mockCategoryDelete = vi.fn();
const mockBrandFindAll = vi.fn();
const mockBrandFindById = vi.fn();
const mockBrandCreate = vi.fn();
const mockBrandUpdate = vi.fn();
const mockBrandDelete = vi.fn();
const mockGetMainImagesForEntities = vi.fn();
const mockGetMainImageUrl = vi.fn();
const mockDeleteAllImages = vi.fn();

vi.mock('../../src/repositories/category.repository', () => ({
  categoryRepository: {
    findAll: mockCategoryFindAll,
    findFeatured: mockCategoryFindFeatured,
    findById: mockCategoryFindById,
    create: mockCategoryCreate,
    update: mockCategoryUpdate,
    delete: mockCategoryDelete,
  },
}));

vi.mock('../../src/repositories/brand.repository', () => ({
  brandRepository: {
    findAll: mockBrandFindAll,
    findById: mockBrandFindById,
    create: mockBrandCreate,
    update: mockBrandUpdate,
    delete: mockBrandDelete,
  },
}));

vi.mock('../../src/services/image.service', () => ({
  imageService: {
    getMainImagesForEntities: mockGetMainImagesForEntities,
    getMainImageUrl: mockGetMainImageUrl,
    deleteAllImagesForEntity: mockDeleteAllImages,
  },
}));

describe('Categories & Brands integration', () => {
  beforeEach(() => {
    resetTestApp();
    vi.clearAllMocks();
    mockGetMainImagesForEntities.mockResolvedValue(new Map());
    mockGetMainImageUrl.mockResolvedValue(null);
    mockDeleteAllImages.mockResolvedValue(true);
  });

  describe('Categories', () => {
    it('GET /api/v1/categories returns all categories', async () => {
      mockCategoryFindAll.mockResolvedValue([mockCategory]);
      const agent = await getTestAgent();

      const response = await agent.get('/api/v1/categories');

      expect(response.status).toBe(200);
      expect(response.body.data[0].category_name).toBe('Rice & Pulses');
    });

    it('GET /api/v1/categories/featured returns featured categories', async () => {
      mockCategoryFindFeatured.mockResolvedValue([mockCategory]);
      const agent = await getTestAgent();

      const response = await agent.get('/api/v1/categories/featured');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('POST /api/v1/admin/categories creates category', async () => {
      mockCategoryCreate.mockResolvedValue(mockCategory);
      const agent = await getTestAgent();

      const response = await agent
        .post('/api/v1/admin/categories')
        .send({ categoryName: 'Rice & Pulses', isFeatured: true });

      expect(response.status).toBe(201);
    });

    it('PUT /api/v1/admin/categories/:id updates category', async () => {
      mockCategoryUpdate.mockResolvedValue({ ...mockCategory, category_name: 'Grains' });
      const agent = await getTestAgent();

      const response = await agent
        .put('/api/v1/admin/categories/1')
        .send({ categoryName: 'Grains' });

      expect(response.status).toBe(200);
    });

    it('DELETE /api/v1/admin/categories/:id deletes category', async () => {
      mockCategoryDelete.mockResolvedValue(undefined);
      const agent = await getTestAgent();

      const response = await agent.delete('/api/v1/admin/categories/1');

      expect(response.status).toBe(204);
      expect(mockDeleteAllImages).toHaveBeenCalledWith(1, 'categories');
    });
  });

  describe('Brands', () => {
    it('GET /api/v1/brands returns all brands', async () => {
      mockBrandFindAll.mockResolvedValue([mockBrand]);
      const agent = await getTestAgent();

      const response = await agent.get('/api/v1/brands');

      expect(response.status).toBe(200);
      expect(response.body.data[0].brandname).toBe('National Foods');
    });

    it('POST /api/v1/admin/brands creates brand', async () => {
      mockBrandCreate.mockResolvedValue(mockBrand);
      const agent = await getTestAgent();

      const response = await agent
        .post('/api/v1/admin/brands')
        .send({ brandname: 'National Foods', isVerified: true });

      expect(response.status).toBe(201);
    });

    it('PUT /api/v1/admin/brands/:id updates brand', async () => {
      mockBrandUpdate.mockResolvedValue({ ...mockBrand, brandname: 'Shan Foods' });
      const agent = await getTestAgent();

      const response = await agent
        .put('/api/v1/admin/brands/1')
        .send({ brandname: 'Shan Foods' });

      expect(response.status).toBe(200);
    });

    it('DELETE /api/v1/admin/brands/:id deletes brand', async () => {
      mockBrandDelete.mockResolvedValue(undefined);
      const agent = await getTestAgent();

      const response = await agent.delete('/api/v1/admin/brands/1');

      expect(response.status).toBe(204);
    });
  });
});
