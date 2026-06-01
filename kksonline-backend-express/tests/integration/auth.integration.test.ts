import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTestAgent, resetTestApp } from '../helpers/test-app';

const mockAuthenticateWithGoogle = vi.fn();
const mockRefreshAccessToken = vi.fn();
const mockFindCustomerById = vi.fn();

vi.mock('../../src/services/auth.service', () => ({
  authService: {
    authenticateWithGoogle: mockAuthenticateWithGoogle,
    refreshAccessToken: mockRefreshAccessToken,
    findCustomerById: mockFindCustomerById,
  },
}));

describe('Auth integration', () => {
  beforeEach(() => {
    resetTestApp();
    vi.clearAllMocks();
  });

  it('POST /api/v1/auth/google authenticates user', async () => {
    mockAuthenticateWithGoogle.mockResolvedValue({
      token: 'jwt-token',
      user: { id: 1, email: 'ali@example.com', firstName: 'Ali', lastName: 'Khan' },
    });
    const agent = await getTestAgent();

    const response = await agent
      .post('/api/v1/auth/google')
      .send({ idToken: 'valid-google-token' });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBe('jwt-token');
  });

  it('POST /api/v1/auth/google validates request body', async () => {
    const agent = await getTestAgent();

    const response = await agent.post('/api/v1/auth/google').send({});

    expect(response.status).toBe(422);
  });

  it('POST /api/v1/auth/refresh propagates not-implemented error', async () => {
    mockRefreshAccessToken.mockRejectedValue(new Error('Not implemented'));
    const agent = await getTestAgent();

    const response = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'refresh-token' });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
