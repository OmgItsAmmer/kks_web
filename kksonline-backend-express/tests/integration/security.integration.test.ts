import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTestAgent, resetTestApp } from '../helpers/test-app';

vi.mock('../../src/config/database.config', () => ({
  db: new Proxy({}, { get: () => new Proxy(() => undefined, { get: () => vi.fn() }) }),
  checkDatabaseConnection: vi.fn().mockResolvedValue(true),
  disconnectDatabase: vi.fn(),
  getPrismaClient: vi.fn(),
}));

/**
 * Authorisation coverage (plan 5.3): the old admin API was open to the whole internet.
 * These tests list the admin routes and prove none of them answers without a session.
 */
describe('admin API security', () => {
  beforeEach(() => resetTestApp());

  const ADMIN_ROUTES: [string, string][] = [
    ['GET', '/api/v1/admin/products'],
    ['POST', '/api/v1/admin/products'],
    ['GET', '/api/v1/admin/orders'],
    ['GET', '/api/v1/admin/orders/1'],
    ['POST', '/api/v1/admin/orders/1/transition'],
    ['GET', '/api/v1/admin/inventory/stock'],
    ['POST', '/api/v1/admin/inventory/adjustments'],
    ['GET', '/api/v1/admin/customers'],
    ['GET', '/api/v1/admin/reviews'],
    ['GET', '/api/v1/admin/dashboard'],
    ['GET', '/api/v1/admin/reports/sales'],
    ['GET', '/api/v1/admin/settings/shop'],
    ['PUT', '/api/v1/admin/settings/shop'],
    ['GET', '/api/v1/admin/audit'],
    ['GET', '/api/v1/admin/notifications/latest'],
    ['POST', '/api/v1/admin/ai/product-description'],
    ['GET', '/api/v1/admin/auth/me'],
  ];

  it.each(ADMIN_ROUTES)('%s %s needs a session', async (method, path) => {
    const agent = await getTestAgent();
    const origin = 'http://localhost:5174';
    const req = method === 'GET' ? agent.get(path) : method === 'POST' ? agent.post(path) : agent.put(path);
    const response = await req.set('Origin', origin).send(method === 'GET' ? undefined : {});
    expect(response.status).toBe(401);
  });

  it('rejects a state-changing admin request from another origin', async () => {
    const agent = await getTestAgent();
    const response = await agent.post('/api/v1/admin/auth/login').set('Origin', 'https://evil.example').send({ email: 'a@b.co', password: 'x' });
    expect(response.status).toBe(403);
  });

  it('does not let a customer token open the admin API', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const customerToken = jwt.sign({ id: 1, email: 'c@example.com', role: 'owner', customerId: 1 }, process.env.JWT_SECRET as string);
    const agent = await getTestAgent();
    const response = await agent.get('/api/v1/admin/products').set('Authorization', `Bearer ${customerToken}`).set('Cookie', `kks_admin_session=${customerToken}`);
    expect(response.status).toBe(401);
  });

  it('keeps the scheduled-jobs endpoints hidden without the secret', async () => {
    const agent = await getTestAgent();
    for (const job of ['release-reservations', 'retention', 'usage-check']) {
      const response = await agent.post(`/api/v1/internal/jobs/${job}`);
      expect(response.status).toBe(404);
    }
  });

  it('never trusts the old X-Customer-Id header', async () => {
    const agent = await getTestAgent();
    const response = await agent.get('/api/v1/orders').set('X-Customer-Id', '1');
    expect(response.status).toBe(401);
  });

  it('does not cache anything personal at the edge, but caches public catalog reads', async () => {
    const agent = await getTestAgent();
    const cart = await agent.get('/api/v1/cart');
    expect(cart.headers['cache-control']).toBe('no-store');
    const shop = await agent.get('/api/v1/shop');
    // The shop route may fail without a real database, but its caching header is decided before the handler runs
    expect(String(shop.headers['cache-control'])).toContain('s-maxage=60');
  });
});
