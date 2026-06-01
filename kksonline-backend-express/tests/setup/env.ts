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
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
    GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-api-key',
    CLOUDINARY_API_SECRET: 'test-api-secret',
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
