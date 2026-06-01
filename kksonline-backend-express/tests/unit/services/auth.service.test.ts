import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCustomer } from '../../helpers/factories';

const mockVerifyIdToken = vi.fn();
const mockFindByAuthUid = vi.fn();
const mockFindByEmail = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateFcmToken = vi.fn();
const mockGenerateToken = vi.fn();

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

vi.mock('../../../src/repositories/customer.repository', () => ({
  customerRepository: {
    findByAuthUid: mockFindByAuthUid,
    findByEmail: mockFindByEmail,
    findById: mockFindById,
    create: mockCreate,
    update: mockUpdate,
    updateFcmToken: mockUpdateFcmToken,
  },
}));

vi.mock('../../../src/utils/jwt.utils', () => ({
  generateToken: mockGenerateToken,
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateToken.mockReturnValue('jwt-token-abc');
  });

  it('authenticates new Google user and creates customer', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-uid-123',
        email: 'ali@example.com',
        given_name: 'Ali',
        family_name: 'Khan',
        picture: 'https://example.com/pic.jpg',
      }),
    });
    mockFindByAuthUid.mockResolvedValue(null);
    mockFindByEmail.mockResolvedValue(null);
    mockCreate.mockResolvedValue(mockCustomer);

    const { authService } = await import('../../../src/services/auth.service');
    const result = await authService.authenticateWithGoogle('valid-id-token');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_uid: 'google-uid-123',
        email: 'ali@example.com',
        first_name: 'Ali',
        last_name: 'Khan',
      })
    );
    expect(result.token).toBe('jwt-token-abc');
    expect(result.user.email).toBe('ali@example.com');
  });

  it('links existing customer by email to Google auth_uid', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-uid-new',
        email: 'ali@example.com',
        given_name: 'Ali',
        family_name: 'Khan',
      }),
    });
    mockFindByAuthUid.mockResolvedValue(null);
    mockFindByEmail.mockResolvedValue(mockCustomer);
    mockUpdate.mockResolvedValue({ ...mockCustomer, auth_uid: 'google-uid-new' });

    const { authService } = await import('../../../src/services/auth.service');
    await authService.authenticateWithGoogle('valid-id-token');

    expect(mockUpdate).toHaveBeenCalledWith(mockCustomer.customer_id, {
      auth_uid: 'google-uid-new',
    });
  });

  it('throws UnauthorizedError when Google token payload is missing email', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-uid-123' }),
    });

    const { authService } = await import('../../../src/services/auth.service');
    await expect(authService.authenticateWithGoogle('token')).rejects.toThrow(
      /Email not found|Authentication failed/
    );
  });

  it('throws UnauthorizedError on client ID mismatch', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Wrong recipient, audience mismatch'));

    const { authService } = await import('../../../src/services/auth.service');
    await expect(authService.authenticateWithGoogle('bad-token')).rejects.toThrow(
      'Google Client ID mismatch'
    );
  });

  it('throws InternalServerError on unexpected verification failure', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Network failure'));

    const { authService } = await import('../../../src/services/auth.service');
    await expect(authService.authenticateWithGoogle('bad-token')).rejects.toThrow(
      'Authentication failed'
    );
  });

  it('updates FCM token when provided for existing customer', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-uid-123',
        email: 'ali@example.com',
      }),
    });
    mockFindByAuthUid.mockResolvedValue(mockCustomer);
    mockUpdateFcmToken.mockResolvedValue(undefined);

    const { authService } = await import('../../../src/services/auth.service');
    await authService.authenticateWithGoogle('valid-id-token', 'new-fcm-token');

    expect(mockUpdateFcmToken).toHaveBeenCalledWith(mockCustomer.customer_id, 'new-fcm-token');
  });

  it('findCustomerById delegates to repository', async () => {
    mockFindById.mockResolvedValue(mockCustomer);

    const { authService } = await import('../../../src/services/auth.service');
    const customer = await authService.findCustomerById(1);

    expect(customer).toEqual(mockCustomer);
    expect(mockFindById).toHaveBeenCalledWith(1);
  });

  it('refreshAccessToken is not implemented', async () => {
    const { authService } = await import('../../../src/services/auth.service');
    await expect(authService.refreshAccessToken('refresh')).rejects.toThrow('Not implemented');
  });
});
