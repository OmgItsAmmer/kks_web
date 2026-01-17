export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    API_VERSION: string;
    DATABASE_URL: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_KEY: string;
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    ALLOWED_ORIGINS: string;
    CACHE_TTL_SECONDS: number;
    SUPABASE_S3_ENDPOINT?: string | undefined;
    SUPABASE_S3_ACCESS_KEY_ID?: string | undefined;
    SUPABASE_S3_SECRET_ACCESS_KEY?: string | undefined;
    SUPABASE_S3_REGION?: string | undefined;
    CLOUDINARY_CLOUD_NAME?: string | undefined;
    CLOUDINARY_API_KEY?: string | undefined;
    CLOUDINARY_API_SECRET?: string | undefined;
};
export declare const config: {
    readonly server: {
        readonly nodeEnv: "development" | "production" | "test";
        readonly port: number;
        readonly apiVersion: string;
        readonly isProduction: boolean;
        readonly isDevelopment: boolean;
    };
    readonly database: {
        readonly url: string;
    };
    readonly supabase: {
        readonly url: string;
        readonly serviceKey: string;
        readonly s3: {
            readonly endpoint: string | undefined;
            readonly accessKeyId: string | undefined;
            readonly secretAccessKey: string | undefined;
            readonly region: string;
        };
    };
    readonly auth: {
        readonly jwtSecret: string;
        readonly googleClientId: string;
    };
    readonly cloudinary: {
        readonly cloudName: string | undefined;
        readonly apiKey: string | undefined;
        readonly apiSecret: string | undefined;
    };
    readonly rateLimit: {
        readonly windowMs: number;
        readonly maxRequests: number;
    };
    readonly cors: {
        readonly allowedOrigins: string[];
    };
    readonly cache: {
        readonly ttlSeconds: number;
    };
};
export type Config = typeof config;
//# sourceMappingURL=env.config.d.ts.map