import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env.config.ts';
import { customerRepository } from '../repositories/customer.repository.ts';
import { generateToken } from '../utils/jwt.utils.ts';
import { logger } from '../utils/logger.ts';
import { InternalServerError, UnauthorizedError } from '../utils/errors.ts';

const client = new OAuth2Client(config.auth.googleClientId);

export class AuthService {
    /**
     * Authenticate with Google
     */
    async authenticateWithGoogle(idToken: string, fcmToken?: string) {
        try {
            // Verify Google ID Token
            const ticket = await client.verifyIdToken({
                idToken,
                audience: config.auth.googleClientId,
            });

            const payload = ticket.getPayload();
            if (!payload) {
                throw new UnauthorizedError('Invalid Google ID Token');
            }

            const { sub: authUid, email, given_name: firstName, family_name: lastName, picture } = payload;

            if (!email) {
                throw new UnauthorizedError('Email not found in Google ID Token');
            }

            // Check if customer exists by auth_uid or email
            let customer = await customerRepository.findByAuthUid(authUid);

            if (!customer) {
                customer = await customerRepository.findByEmail(email);

                if (customer) {
                    // Link existing customer with auth_uid
                    customer = await customerRepository.update(customer.customer_id, {
                        auth_uid: authUid,
                    });
                } else {
                    // Create new customer
                    customer = await customerRepository.create({
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
                await customerRepository.updateFcmToken(customer.customer_id, fcmToken);
            }

            // Generate JWT
            const token = generateToken({
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
        } catch (error) {
            logger.error('Google authentication failed', error);
            if (error instanceof UnauthorizedError) {
                throw error;
            }
            throw new InternalServerError('Authentication failed');
        }
    }

    /**
     * Refresh Access Token (Placeholder for future implementation)
     * Since we are using short-lived JWTs (1h), the client should just re-login with Google
     * or we can implement refresh tokens later.
     */
    async refreshAccessToken(refreshToken: string) {
        // TODO: Implement refresh token logic if needed
        throw new Error('Not implemented');
    }

    /**
     * Find customer by ID
     */
    async findCustomerById(customerId: number) {
        return customerRepository.findById(customerId);
    }

    /**
     * Get customer profile picture (from Google or other source)
     * For now, we don't store the picture URL in the DB, so we might need to fetch it or store it.
     * The current implementation in customer routes fetches it from image service.
     * We can stick to that or update the customer model to store the picture URL.
     */
    async getCustomerProfilePicture(customerId: number) {
        // This is a placeholder. In a real app, you might want to store the picture URL in the DB.
        // For now, let's assume the client handles the picture from the Google payload.
        return null;
    }

    /**
     * Update FCM Token
     */
    async updateFcmToken(customerId: number, fcmToken: string) {
        return customerRepository.updateFcmToken(customerId, fcmToken);
    }
}

export const authService = new AuthService();
