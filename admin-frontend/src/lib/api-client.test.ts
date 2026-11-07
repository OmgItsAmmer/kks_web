import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setUnauthorizedHandler } from './api-client';

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } }));

afterEach(() => vi.restoreAllMocks());

/** Awaits a call that is expected to fail and returns its error. */
const failure = (p: Promise<unknown>): Promise<ApiError> =>
  p.then(
    () => {
      throw new Error('expected the call to fail');
    },
    (e) => e as ApiError,
  );

describe('api client', () => {
  it('unwraps the data envelope and sends the cookie', async () => {
    const spy = respond(200, { success: true, data: { hello: 'world' } });
    expect(await api.get('/dashboard')).toEqual({ hello: 'world' });
    expect(spy.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include', method: 'GET' });
  });

  it('puts filters in the query string and skips empty ones', async () => {
    const spy = respond(200, { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0, hasMore: false } });
    await api.list('/orders', { q: 'ali', status: '', page: 2 });
    expect(String(spy.mock.calls[0]?.[0])).toMatch(/\/admin\/orders\?q=ali&page=2$/);
  });

  it('turns an error response into an ApiError with the request id', async () => {
    respond(409, { success: false, error: 'This order was changed by someone else.', errorCode: 'ALREADY_EXISTS' }, { 'x-request-id': 'abc-123' });
    const err = await failure(api.post('/orders/1/transition', {}));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('This order was changed by someone else.');
    expect(err.status).toBe(409);
    expect(err.isStale).toBe(true);
    expect(err.requestId).toBe('abc-123');
  });

  it('joins validation messages for the person', async () => {
    respond(422, { success: false, error: 'Validation failed', errors: { body: ['name: Required'] } });
    const err = await failure(api.post('/products', {}));
    expect(err.message).toContain('name: Required');
  });

  it('signs the person out when the session has expired', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    respond(401, { success: false, error: 'Sign in required' });
    await api.get('/dashboard').catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not sign out on a wrong password', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    respond(401, { success: false, error: 'Wrong email or password' });
    await api.post('/auth/login', {}).catch(() => undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it('explains a network failure in plain words', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await failure(api.get('/dashboard'));
    expect(err.message).toMatch(/Cannot reach the server/);
  });
});
