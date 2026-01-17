import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env.config';
import { customerRepository } from '../repositories/customer.repository';
import { generateToken } from '../utils/jwt.utils';
import { logger } from '../utils/logger';
import { InternalServerError, UnauthorizedError } from '../utils/errors';

const client = new OAuth2Client(config.auth.googleClientId);

export class AuthService {
    /**
     * Authenticate with Google
     */
    async authenticateWithGoogle(idToken: string, fcmToken?: string) {
        try {
            // Log the Client ID being used for debugging
            logger.info('Verifying Google token with Client ID:', {
                clientId: config.auth.googleClientId.substring(0, 20) + '...',
                fullClientId: config.auth.googleClientId,
            });

            // Decode token to see what audience it was issued for (for debugging)
            try {
                const tokenParts = idToken.split('.');
                if (tokenParts.length === 3 && tokenParts[1]) {
                    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                    logger.info('Token payload audience:', {
                        audience: payload.aud,
                        issuer: payload.iss,
                        email: payload.email,
                    });
                    
                    if (payload.aud && payload.aud !== config.auth.googleClientId) {
                        logger.error('Client ID mismatch detected:', {
                            expected: config.auth.googleClientId,
                            received: payload.aud,
                        });
                    }
                }
            } catch (decodeError) {
                logger.warn('Could not decode token for debugging:', decodeError);
            }

            // Verify Google ID Token
            // Note: The audience must match the Client ID used in the frontend
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
        } catch (error: any) {
            logger.error('Google authentication failed', error);
            
            // Provide more specific error messages
            if (error?.message?.includes('Wrong recipient') || error?.message?.includes('audience')) {
                logger.error('Client ID mismatch detected. Frontend and backend must use the SAME Google Client ID.');
                throw new UnauthorizedError('Google Client ID mismatch. Please check your configuration.');
            }
            
            if (error instanceof UnauthorizedError) {
                throw error;
            }
            
            // Log the actual error for debugging
            logger.error('Authentication error details:', {
                message: error?.message,
                code: error?.code,
                stack: error?.stack,
            });
            
            throw new InternalServerError('Authentication failed. Please try again.');
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
