import type { GoogleUserInfo, AuthResponse, JwtPayload, RefreshTokenPayload, AuthUser } from '../types/api.types.js';
import type { Tables } from '../types/database.types.js';
export declare class AuthService {
    /**
     * Verify Google ID token and extract user info
     */
    verifyGoogleToken(idToken: string): Promise<GoogleUserInfo>;
    /**
     * Authenticate user with Google OAuth
     */
    authenticateWithGoogle(idToken: string, fcmToken?: string): Promise<AuthResponse>;
    /**
     * Find customer by email
     */
    findCustomerByEmail(email: string): Promise<Tables<'customers'> | null>;
    /**
     * Find customer by ID
     */
    findCustomerById(customerId: number): Promise<Tables<'customers'> | null>;
    /**
     * Create customer from Google OAuth data
     */
    createCustomerFromGoogle(googleUser: GoogleUserInfo, fcmToken?: string): Promise<Tables<'customers'>>;
    /**
     * Upload Google profile picture to Cloudinary and save to database
     */
    private uploadGoogleProfilePicture;
    /**
     * Update customer FCM token
     */
    updateFcmToken(customerId: number, fcmToken: string): Promise<void>;
    /**
     * Get customer profile picture URL
     */
    getCustomerProfilePicture(customerId: number): Promise<string | null>;
    /**
     * Generate access and refresh tokens
     */
    generateTokens(customer: Tables<'customers'>): {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
    /**
     * Verify access token
     */
    verifyAccessToken(token: string): JwtPayload;
    /**
     * Verify refresh token
     */
    verifyRefreshToken(token: string): RefreshTokenPayload;
    /**
     * Refresh access token
     */
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    /**
     * Parse expiry time string to seconds
     */
    private parseExpiryTime;
    /**
     * Convert JWT payload to AuthUser
     */
    tokenPayloadToAuthUser(payload: JwtPayload): AuthUser;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map