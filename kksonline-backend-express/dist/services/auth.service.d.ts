export declare class AuthService {
    /**
     * Authenticate with Google
     */
    authenticateWithGoogle(idToken: string, fcmToken?: string): Promise<{
        token: string;
        user: {
            id: number;
            email: string;
            firstName: string;
            lastName: string | null;
            profilePicture: string | undefined;
        };
    }>;
    /**
     * Refresh Access Token (Placeholder for future implementation)
     * Since we are using short-lived JWTs (1h), the client should just re-login with Google
     * or we can implement refresh tokens later.
     */
    refreshAccessToken(refreshToken: string): Promise<void>;
    /**
     * Find customer by ID
     */
    findCustomerById(customerId: number): Promise<{
        created_at: Date | null;
        customer_id: number;
        phone_number: string | null;
        first_name: string;
        last_name: string | null;
        cnic: string | null;
        email: string;
        dob: Date | null;
        gender: import(".prisma/client").$Enums.Gender | null;
        auth_uid: string | null;
        fcm_token: string | null;
    } | null>;
    /**
     * Get customer profile picture (from Google or other source)
     * For now, we don't store the picture URL in the DB, so we might need to fetch it or store it.
     * The current implementation in customer routes fetches it from image service.
     * We can stick to that or update the customer model to store the picture URL.
     */
    getCustomerProfilePicture(customerId: number): Promise<null>;
    /**
     * Update FCM Token
     */
    updateFcmToken(customerId: number, fcmToken: string): Promise<void>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map