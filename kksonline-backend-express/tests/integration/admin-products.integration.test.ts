import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTestAgent, resetTestApp } from '../helpers/test-app';
import { mockProduct, mockVariant } from '../helpers/factories';

const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();
const mockDeleteProduct = vi.fn();
const mockToggleVisibility = vi.fn();
const mockBulkUpdate = vi.fn();
const mockBulkDelete = vi.fn();
const mockCreateVariant = vi.fn();
const mockUpdateVariant = vi.fn();
const mockDeleteVariant = vi.fn();
const mockFindAll = vi.fn();
const mockGetAllVariants = vi.fn();

vi.mock('../../src/services/product.service', () => ({
  productService: {
    createProduct: mockCreateProduct,
    updateProduct: mockUpdateProduct,
    deleteProduct: mockDeleteProduct,
    toggleVisibility: mockToggleVisibility,
    bulkUpdateProducts: mockBulkUpdate,
    bulkDeleteProducts: mockBulkDelete,
    createVariant: mockCreateVariant,
    updateVariant: mockUpdateVariant,
    deleteVariant: mockDeleteVariant,
  },
}));

vi.mock('../../src/repositories/product.repository', () => ({
  productRepository: {
    findAll: mockFindAll,
    getAllVariants: mockGetAllVariants,
  },
}));

describe('Admin products CRUD integration', () => {
  beforeEach(() => {
    resetTestApp();
    vi.clearAllMocks();
  });

  it('GET /api/v1/admin/products lists all products', async () => {
    mockFindAll.mockResolvedValue({ products: [mockProduct], total: 1 });
    const agent = await getTestAgent();

    const response = await agent.get('/api/v1/admin/products');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it('POST /api/v1/admin/products creates product', async () => {
    mockCreateProduct.mockResolvedValue(mockProduct);
    const agent = await getTestAgent();

    const response = await agent
      .post('/api/v1/admin/products')
      .send({
        name: 'Basmati Rice 5kg',
        basePrice: '1200',
        salePrice: '1150',
        isVisible: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.product_id).toBe(1);
  });

  it('PUT /api/v1/admin/products/:id updates product', async () => {
    mockUpdateProduct.mockResolvedValue({ ...mockProduct, name: 'Updated Rice' });
    const agent = await getTestAgent();

    const response = await agent
      .put('/api/v1/admin/products/1')
      .send({ name: 'Updated Rice' });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Updated Rice');
  });

  it('DELETE /api/v1/admin/products/:id deletes product', async () => {
    mockDeleteProduct.mockResolvedValue(true);
    const agent = await getTestAgent();

    const response = await agent.delete('/api/v1/admin/products/1');

    expect(response.status).toBe(200);
    expect(mockDeleteProduct).toHaveBeenCalledWith(1);
  });

  it('PATCH /api/v1/admin/products/:id/visibility toggles visibility', async () => {
    mockToggleVisibility.mockResolvedValue({ ...mockProduct, isVisible: false });
    const agent = await getTestAgent();

    const response = await agent
      .patch('/api/v1/admin/products/1/visibility')
      .send({ isVisible: false });

    expect(response.status).toBe(200);
    expect(response.body.data.isVisible).toBe(false);
  });

  it('POST /api/v1/admin/products/bulk-update updates multiple products', async () => {
    mockBulkUpdate.mockResolvedValue({ success: 2, failed: 0, errors: [] });
    const agent = await getTestAgent();

    const response = await agent
      .post('/api/v1/admin/products/bulk-update')
      .send({ productIds: [1, 2], updates: { isVisible: true } });

    expect(response.status).toBe(200);
    expect(response.body.data.success).toBe(2);
  });

  it('POST /api/v1/admin/products/:id/variants creates variant', async () => {
    mockCreateVariant.mockResolvedValue(mockVariant);
    const agent = await getTestAgent();

    const response = await agent
      .post('/api/v1/admin/products/1/variants')
      .send({
        variantName: '5kg Bag',
        buyPrice: 1000,
        sellPrice: 1150,
        stock: 50,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.variant_id).toBe(1);
  });

  it('GET /api/v1/admin/products/:id/variants lists variants', async () => {
    mockGetAllVariants.mockResolvedValue([mockVariant]);
    const agent = await getTestAgent();

    const response = await agent.get('/api/v1/admin/products/1/variants');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it('PUT /api/v1/admin/products/:id/variants/:variantId updates variant', async () => {
    mockUpdateVariant.mockResolvedValue({ ...mockVariant, sell_price: 1200 });
    const agent = await getTestAgent();

    const response = await agent
      .put('/api/v1/admin/products/1/variants/1')
      .send({ sellPrice: 1200 });

    expect(response.status).toBe(200);
  });

  it('DELETE /api/v1/admin/products/:id/variants/:variantId deletes variant', async () => {
    mockDeleteVariant.mockResolvedValue(true);
    const agent = await getTestAgent();

    const response = await agent.delete('/api/v1/admin/products/1/variants/1');

    expect(response.status).toBe(200);
  });
});
