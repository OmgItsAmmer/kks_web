"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const node_console_1 = __importDefault(require("node:console"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    // Server
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('5000').transform(Number),
    API_VERSION: zod_1.z.string().default('v1'),
    // Database (Prisma direct connection to Supabase)
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    // Supabase Storage
    SUPABASE_URL: zod_1.z.string().min(1, 'SUPABASE_URL is required'),
    SUPABASE_SERVICE_KEY: zod_1.z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),
    // Supabase S3 Protocol (for storage access)
    SUPABASE_S3_ENDPOINT: zod_1.z.string().optional(),
    SUPABASE_S3_ACCESS_KEY_ID: zod_1.z.string().optional(),
    SUPABASE_S3_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    SUPABASE_S3_REGION: zod_1.z.string().optional(),
    // Auth
    JWT_SECRET: zod_1.z.string().min(1, 'JWT_SECRET is required'),
    GOOGLE_CLIENT_ID: zod_1.z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
    // Cloudinary (optional - for legacy image uploads)
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    CLOUDINARY_API_KEY: zod_1.z.string().optional(),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional(),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().default('900000').transform(Number),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().default('100').transform(Number),
    // CORS
    ALLOWED_ORIGINS: zod_1.z.string().default('http://localhost:3000,http://localhost:5173'),
    // Cache
    CACHE_TTL_SECONDS: zod_1.z.string().default('1800').transform(Number),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    node_console_1.default.error('❌ Invalid environment variables:');
    node_console_1.default.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
exports.config = {
    server: {
        nodeEnv: exports.env.NODE_ENV,
        port: exports.env.PORT,
        apiVersion: exports.env.API_VERSION,
        isProduction: exports.env.NODE_ENV === 'production',
        isDevelopment: exports.env.NODE_ENV === 'development',
    },
    database: {
        url: exports.env.DATABASE_URL,
    },
    supabase: {
        url: exports.env.SUPABASE_URL,
        serviceKey: exports.env.SUPABASE_SERVICE_KEY,
        s3: {
            endpoint: exports.env.SUPABASE_S3_ENDPOINT,
            accessKeyId: exports.env.SUPABASE_S3_ACCESS_KEY_ID,
            secretAccessKey: exports.env.SUPABASE_S3_SECRET_ACCESS_KEY,
            region: exports.env.SUPABASE_S3_REGION || 'ap-southeast-1',
        },
    },
    auth: {
        jwtSecret: exports.env.JWT_SECRET,
        googleClientId: exports.env.GOOGLE_CLIENT_ID,
    },
    cloudinary: {
        cloudName: exports.env.CLOUDINARY_CLOUD_NAME,
        apiKey: exports.env.CLOUDINARY_API_KEY,
        apiSecret: exports.env.CLOUDINARY_API_SECRET,
    },
    rateLimit: {
        windowMs: exports.env.RATE_LIMIT_WINDOW_MS,
        maxRequests: exports.env.RATE_LIMIT_MAX_REQUESTS,
    },
    cors: {
        allowedOrigins: exports.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
    },
    cache: {
        ttlSeconds: exports.env.CACHE_TTL_SECONDS,
    },
};
//# sourceMappingURL=env.config.js.map