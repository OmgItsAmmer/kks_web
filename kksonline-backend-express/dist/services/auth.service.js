"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const google_auth_library_1 = require("google-auth-library");
const env_config_ts_1 = require("../config/env.config.ts");
const customer_repository_ts_1 = require("../repositories/customer.repository.ts");
const jwt_utils_ts_1 = require("../utils/jwt.utils.ts");
const logger_ts_1 = require("../utils/logger.ts");
const errors_ts_1 = require("../utils/errors.ts");
const client = new google_auth_library_1.OAuth2Client(env_config_ts_1.config.auth.googleClientId);
class AuthService {
    /**
     * Authenticate with Google
     */
    async authenticateWithGoogle(idToken, fcmToken) {
        try {
            // Log the Client ID being used for debugging
            logger_ts_1.logger.info('Verifying Google token with Client ID:', {
                clientId: env_config_ts_1.config.auth.googleClientId.substring(0, 20) + '...',
                fullClientId: env_config_ts_1.config.auth.googleClientId,
            });
            // Decode token to see what audience it was issued for (for debugging)
            try {
                const tokenParts = idToken.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                    logger_ts_1.logger.info('Token payload audience:', {
                        audience: payload.aud,
                        issuer: payload.iss,
                        email: payload.email,
                    });
                    if (payload.aud && payload.aud !== env_config_ts_1.config.auth.googleClientId) {
                        logger_ts_1.logger.error('Client ID mismatch detected:', {
                            expected: env_config_ts_1.config.auth.googleClientId,
                            received: payload.aud,
                        });
                    }
                }
            }
            catch (decodeError) {
                logger_ts_1.logger.warn('Could not decode token for debugging:', decodeError);
            }
            // Verify Google ID Token
            // Note: The audience must match the Client ID used in the frontend
            const ticket = await client.verifyIdToken({
                idToken,
                audience: env_config_ts_1.config.auth.googleClientId,
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw new errors_ts_1.UnauthorizedError('Invalid Google ID Token');
            }
            const { sub: authUid, email, given_name: firstName, family_name: lastName, picture } = payload;
            if (!email) {
                throw new errors_ts_1.UnauthorizedError('Email not found in Google ID Token');
            }
            // Check if customer exists by auth_uid or email
            let customer = await customer_repository_ts_1.customerRepository.findByAuthUid(authUid);
            if (!customer) {
                customer = await customer_repository_ts_1.customerRepository.findByEmail(email);
                if (customer) {
                    // Link existing customer with auth_uid
                    customer = await customer_repository_ts_1.customerRepository.update(customer.customer_id, {
                        auth_uid: authUid,
                    });
                }
                else {
                    // Create new customer
                    customer = await customer_repository_ts_1.customerRepository.create({
                        auth_uid: authUid,
                        email,
                        first_name: firstName || '',
                        last_name: lastName || '',
                        fcm_token: fcmToken,
                    });
                }
            }
            // Update FCM token if provided and different
            if (fcmToken && customer.fcm_token !== fcmToken) {
                await customer_repository_ts_1.customerRepository.updateFcmToken(customer.customer_id, fcmToken);
            }
            // Generate JWT
            const token = (0, jwt_utils_ts_1.generateToken)({
                id: customer.customer_id,
                email: customer.email,
                role: 'customer',
                customerId: customer.customer_id,
            });
            return {
                token,
                user: {
                    id: customer.customer_id,
                    email: customer.email,
                    firstName: customer.first_name,
                    lastName: customer.last_name,
                    profilePicture: picture,
                },
            };
        }
        catch (error) {
            logger_ts_1.logger.error('Google authentication failed', error);
            // Provide more specific error messages
            if (error?.message?.includes('Wrong recipient') || error?.message?.includes('audience')) {
                logger_ts_1.logger.error('Client ID mismatch detected. Frontend and backend must use the SAME Google Client ID.');
                throw new errors_ts_1.UnauthorizedError('Google Client ID mismatch. Please check your configuration.');
            }
            if (error instanceof errors_ts_1.UnauthorizedError) {
                throw error;
            }
            // Log the actual error for debugging
            logger_ts_1.logger.error('Authentication error details:', {
                message: error?.message,
                code: error?.code,
                stack: error?.stack,
            });
            throw new errors_ts_1.InternalServerError('Authentication failed. Please try again.');
        }
    }
    /**
     * Refresh Access Token (Placeholder for future implementation)
     * Since we are using short-lived JWTs (1h), the client should just re-login with Google
     * or we can implement refresh tokens later.
     */
    async refreshAccessToken(refreshToken) {
        // TODO: Implement refresh token logic if needed
        throw new Error('Not implemented');
    }
    /**
     * Find customer by ID
     */
    async findCustomerById(customerId) {
        return customer_repository_ts_1.customerRepository.findById(customerId);
    }
    /**
     * Get customer profile picture (from Google or other source)
     * For now, we don't store the picture URL in the DB, so we might need to fetch it or store it.
     * The current implementation in customer routes fetches it from image service.
     * We can stick to that or update the customer model to store the picture URL.
     */
    async getCustomerProfilePicture(customerId) {
        // This is a placeholder. In a real app, you might want to store the picture URL in the DB.
        // For now, let's assume the client handles the picture from the Google payload.
        return null;
    }
    /**
     * Update FCM Token
     */
    async updateFcmToken(customerId, fcmToken) {
        return customer_repository_ts_1.customerRepository.updateFcmToken(customerId, fcmToken);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map