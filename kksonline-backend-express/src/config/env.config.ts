import console from 'node:console';
import { z } from 'zod';
import { loadEnv } from './load-env';

// Load environment variables according to unified precedence
const envInfo = loadEnv();

const optionalString = z

  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  API_VERSION: z.string().default('v1'),

  // Database (Neon). Pooled URL at runtime; direct URL for migrations only.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_UNPOOLED: optionalString,

  // Storefront customer auth
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),

  // Object storage: Cloudflare R2
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_PUBLIC_BUCKET: z.string().default('kks-public'),
  R2_PRIVATE_BUCKET: z.string().default('kks-private'),
  ASSET_BASE_URL: optionalString,

  // Cloudflare edge cache purge
  CLOUDFLARE_ZONE_ID: optionalString,
  CLOUDFLARE_API_TOKEN: optionalString,

  // Admin sign-in (fixed accounts, plan 5.1)
  ADMIN_ACCOUNTS: optionalString,
  ADMIN_SESSION_SECRET: optionalString,
  ADMIN_ORIGIN: z.string().default('http://localhost:5174'),
  COOKIE_DOMAIN: optionalString,

  // AI descriptions
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  AI_DAILY_LIMIT_PER_ADMIN: z.string().default('300').transform(Number),

  // Admin desktop alerts (Web Push). Generate a pair with `npm run push:keys`. Unset = alerts off.
  VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  VAPID_SUBJECT: z.string().default('mailto:admin@kks-online.com'),

  // Scheduled jobs and monitoring
  JOBS_SECRET: optionalString,
  SENTRY_DSN: optionalString,
  NEON_API_KEY: optionalString,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

  // Cache
  CACHE_TTL_SECONDS: z.string().default('1800').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Production fast-fail check: If NODE_ENV is production, verify required production variables
if (env.NODE_ENV === 'production') {
  const requiredProductionKeys: Array<keyof typeof env> = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_ZONE_ID',
    'CLOUDFLARE_API_TOKEN',
    'ADMIN_ACCOUNTS',
    'ADMIN_SESSION_SECRET',
    'JOBS_SECRET',
  ];

  // A shared dev deployment (DEPLOY_TIER=dev) must not hold the Cloudflare keys: they purge the whole live zone.
  const devTier = process.env.DEPLOY_TIER === 'dev';
  const missingProd = requiredProductionKeys.filter((key) => {
    if (devTier && (key === 'CLOUDFLARE_ZONE_ID' || key === 'CLOUDFLARE_API_TOKEN')) return false;
    const val = env[key];
    return val === undefined || val === null || val === '';
  });

  if (missingProd.length > 0) {
    console.error(`❌ [Production Guard] Missing required production environment variables: ${missingProd.join(', ')}`);
    process.exit(1);
  }
}


const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

export const config = {
  server: {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    apiVersion: env.API_VERSION,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
  },
  database: {
    url: env.DATABASE_URL,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    googleClientId: env.GOOGLE_CLIENT_ID,
  },
  r2: {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    publicBucket: env.R2_PUBLIC_BUCKET,
    privateBucket: env.R2_PRIVATE_BUCKET,
    assetBaseUrl: env.ASSET_BASE_URL?.replace(/\/+$/, ''),
  },
  cloudflare: {
    zoneId: env.CLOUDFLARE_ZONE_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
  },
  admin: {
    accountsJson: env.ADMIN_ACCOUNTS,
    sessionSecret: env.ADMIN_SESSION_SECRET,
    origin: env.ADMIN_ORIGIN,
    cookieDomain: env.COOKIE_DOMAIN,
  },
  ai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    dailyLimitPerAdmin: env.AI_DAILY_LIMIT_PER_ADMIN,
  },
  push: {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  },
  jobs: {
    secret: env.JOBS_SECRET,
    neonApiKey: env.NEON_API_KEY,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  cors: {
    allowedOrigins: [...splitList(env.ALLOWED_ORIGINS), env.ADMIN_ORIGIN],
  },
  cache: {
    ttlSeconds: env.CACHE_TTL_SECONDS,
  },
} as const;

export type Config = typeof config;
