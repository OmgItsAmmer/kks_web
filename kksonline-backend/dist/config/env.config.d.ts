export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    API_VERSION: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_SECRET: string;
    JWT_REFRESH_EXPIRES_IN: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    ALLOWED_ORIGINS: string;
    CACHE_TTL_SECONDS: number;
    FIREBASE_KEY_BASE64?: string | undefined;
};
export declare const config: {
    readonly server: {
        readonly nodeEnv: "development" | "production" | "test";
        readonly port: number;
        readonly apiVersion: string;
        readonly isProduction: boolean;
        readonly isDevelopment: boolean;
    };
    readonly supabase: {
        readonly url: string;
        readonly anonKey: string;
        readonly serviceRoleKey: string;
    };
    readonly jwt: {
        readonly secret: string;
        readonly expiresIn: string;
        readonly refreshSecret: string;
        readonly refreshExpiresIn: string;
    };
    readonly google: {
        readonly clientId: string;
        readonly clientSecret: string;
    };
    readonly cloudinary: {
        readonly cloudName: string;
        readonly apiKey: string;
        readonly apiSecret: string;
    };
    readonly firebase: {
        readonly keyBase64: string | undefined;
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