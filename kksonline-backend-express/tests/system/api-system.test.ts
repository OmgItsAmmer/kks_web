import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestAgent } from '../helpers/test-app';
import { isDatabaseAvailable, teardownDatabase, systemTestTimeout } from '../helpers/db';

/**
 * System tests exercise the full HTTP stack without mocked repositories.
 * Requires PostgreSQL (docker-compose.test.yml or CI service container).
 */
describe('API system tests', () => {
  beforeAll(async () => {
    const available = await isDatabaseAvailable();
    if (!available) {
      console.warn('Skipping system tests: database not available');
    }
  }, systemTestTimeout);

  afterAll(async () => {
    await teardownDatabase();
  });

  it('health endpoint responds with database status', async () => {
    const available = await isDatabaseAvailable();
    if (!available) return;

    const agent = await getTestAgent();
    const response = await agent.get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(['ok', 'degraded']).toContain(response.body.status);
    expect(response.body).toHaveProperty('timestamp');
  });

  it('public catalog endpoints are reachable', async () => {
    const available = await isDatabaseAvailable();
    if (!available) return;

    const agent = await getTestAgent();

    const endpoints = [
      '/api/v1/categories',
      '/api/v1/brands',
      '/api/v1/products?page=1&pageSize=5',
      '/api/v1/collections/featured',
      '/api/v1/shop/config',
    ];

    for (const path of endpoints) {
      const response = await agent.get(path);
      expect(response.status, `Expected 200 for ${path}`).toBe(200);
      expect(response.body.success).toBe(true);
    }
  });

  it('returns 404 for unknown routes', async () => {
    const agent = await getTestAgent();
    const response = await agent.get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
  });
});
