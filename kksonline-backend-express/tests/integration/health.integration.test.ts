import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTestAgent, resetTestApp } from '../helpers/test-app';

const mockCheckDatabaseConnection = vi.fn();

vi.mock('../../src/config/database.config', () => ({
  db: {
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  },
  checkDatabaseConnection: mockCheckDatabaseConnection,
  disconnectDatabase: vi.fn(),
  getPrismaClient: vi.fn(),
}));

describe('Health integration', () => {
  beforeEach(() => {
    resetTestApp();
    vi.clearAllMocks();
  });

  it('GET /api/v1/health returns ok when database is connected', async () => {
    mockCheckDatabaseConnection.mockResolvedValue(true);
    const agent = await getTestAgent();

    const response = await agent.get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('connected');
  });

  it('GET /api/v1/health returns degraded when database is down', async () => {
    mockCheckDatabaseConnection.mockResolvedValue(false);
    const agent = await getTestAgent();

    const response = await agent.get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('degraded');
    expect(response.body.database).toBe('disconnected');
  });

  it('GET / returns API metadata', async () => {
    const agent = await getTestAgent();
    const response = await agent.get('/');

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('KKS Online Backend API');
    expect(response.body.healthCheck).toBe('/api/v1/health');
  });
});
