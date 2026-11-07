/**
 * Shared test environment variables.
 * Must run before any application modules are imported.
 */
export function applyTestEnv(overrides: Record<string, string> = {}): void {
  const defaults: Record<string, string> = {
    NODE_ENV: 'test',
    PORT: '5001',
    API_VERSION: 'v1',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/kks_test?schema=public',
    JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
    GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
    ADMIN_SESSION_SECRET: 'test-admin-session-secret-0123456789-abcdef',
    ADMIN_ORIGIN: 'http://localhost:5174',
    JOBS_SECRET: 'test-jobs-secret',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '1000',
    ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173',
    CACHE_TTL_SECONDS: '60',
    ...overrides,
  };

  for (const [key, value] of Object.entries(defaults)) {
    process.env[key] = value;
  }
}

applyTestEnv();
