import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestAgent } from '../helpers/test-app';
import { isDatabaseAvailable, teardownDatabase, systemTestTimeout } from '../helpers/db';

/**
 * End-to-end CRUD flows against a real database.
 * Run with: docker compose -f docker-compose.test.yml up -d && npm run test:system
 */
describe('Admin CRUD system tests', () => {
  let categoryId: number;
  let productId: number;
  let variantId: number;

  beforeAll(async () => {
    const available = await isDatabaseAvailable();
    if (!available) {
      console.warn('Skipping CRUD system tests: database not available');
    }
  }, systemTestTimeout);

  afterAll(async () => {
    const agent = await getTestAgent();

    if (variantId) {
      await agent.delete(`/api/v1/admin/products/${productId}/variants/${variantId}`);
    }
    if (productId) {
      await agent.delete(`/api/v1/admin/products/${productId}`);
    }
    if (categoryId) {
      await agent.delete(`/api/v1/admin/categories/${categoryId}`);
    }

    await teardownDatabase();
  });

  it('creates, reads, updates, and deletes a category', async () => {
    const available = await isDatabaseAvailable();
    if (!available) return;

    const agent = await getTestAgent();
    const uniqueName = `Test Category ${Date.now()}`;

    const createRes = await agent
      .post('/api/v1/admin/categories')
      .send({ categoryName: uniqueName, isFeatured: false });

    expect(createRes.status).toBe(201);
    categoryId = createRes.body.data.category_id;

    const listRes = await agent.get('/api/v1/categories');
    expect(listRes.body.data.some((c: { category_id: number }) => c.category_id === categoryId)).toBe(true);

    const updateRes = await agent
      .put(`/api/v1/admin/categories/${categoryId}`)
      .send({ categoryName: `${uniqueName} Updated` });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.category_name).toBe(`${uniqueName} Updated`);
  });

  it('creates product with variant and toggles visibility', async () => {
    const available = await isDatabaseAvailable();
    if (!available) return;

    const agent = await getTestAgent();

    const productRes = await agent
      .post('/api/v1/admin/products')
      .send({
        name: `Test Rice ${Date.now()}`,
        basePrice: '1000',
        salePrice: '950',
        categoryId: categoryId || undefined,
        isVisible: false,
        stockQuantity: 10,
      });

    expect(productRes.status).toBe(201);
    productId = productRes.body.data.product_id;

    const variantRes = await agent
      .post(`/api/v1/admin/products/${productId}/variants`)
      .send({
        variantName: '1kg Pack',
        buyPrice: 800,
        sellPrice: 950,
        stock: 10,
        isVisible: true,
      });

    expect(variantRes.status).toBe(201);
    variantId = variantRes.body.data.variant_id;

    const visibilityRes = await agent
      .patch(`/api/v1/admin/products/${productId}/visibility`)
      .send({ isVisible: true });

    expect(visibilityRes.status).toBe(200);
    expect(visibilityRes.body.data.isVisible).toBe(true);

    const variantsRes = await agent.get(`/api/v1/admin/products/${productId}/variants`);
    expect(variantsRes.body.data).toHaveLength(1);
  });
});
