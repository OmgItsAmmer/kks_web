import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.config.js';
import { supabaseAdmin } from '../config/supabase.config.js';
import { logger } from '../utils/logger.js';
import { UnauthorizedError, InternalServerError, ConflictError } from '../utils/errors.js';
const googleClient = new OAuth2Client(config.google.clientId);
export class AuthService {
    /**
     * Verify Google ID token and extract user info
     */
    async verifyGoogleToken(idToken) {
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: config.google.clientId,
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw new UnauthorizedError('Invalid Google token');
            }
            if (!payload.email_verified) {
                throw new UnauthorizedError('Email not verified by Google');
            }
            return {
                id: payload.sub,
                email: payload.email,
                verified_email: payload.email_verified,
                name: payload.name || '',
                given_name: payload.given_name || '',
                family_name: payload.family_name,
                picture: payload.picture,
            };
        }
        catch (error) {
            if (error instanceof UnauthorizedError)
                throw error;
            logger.error('Google token verification failed', { error });
            throw new UnauthorizedError('Invalid or expired Google token');
        }
    }
    /**
     * Authenticate user with Google OAuth
     */
    async authenticateWithGoogle(idToken, fcmToken) {
        // Verify Google token
        const googleUser = await this.verifyGoogleToken(idToken);
        logger.info('Google user verified', { email: googleUser.email });
        // Find or create customer
        let customer = await this.findCustomerByEmail(googleUser.email);
        if (!customer) {
            // Create new customer from Google data
            customer = await this.createCustomerFromGoogle(googleUser, fcmToken);
            logger.info('New customer created from Google OAuth', { customerId: customer.customer_id });
        }
        else {
            // Update FCM token if provided
            if (fcmToken) {
                await this.updateFcmToken(customer.customer_id, fcmToken);
            }
        }
        // Generate tokens
        const tokens = this.generateTokens(customer);
        // Get profile picture
        const profilePicture = await this.getCustomerProfilePicture(customer.customer_id);
        return {
            ...tokens,
            user: {
                id: customer.auth_uid || `customer_${customer.customer_id}`,
                email: customer.email,
                customerId: customer.customer_id,
                firstName: customer.first_name,
                lastName: customer.last_name,
                profilePicture,
            },
        };
    }
    /**
     * Find customer by email
     */
    async findCustomerByEmail(email) {
        const { data, error } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('email', email)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching customer by email', { error, email });
            throw new InternalServerError('Database error while fetching customer');
        }
        return data;
    }
    /**
     * Find customer by ID
     */
    async findCustomerById(customerId) {
        const { data, error } = await supabaseAdmin
            .from('customers')
            .select('*')
            .eq('customer_id', customerId)
            .single();
        if (error && error.code !== 'PGRST116') {
            logger.error('Error fetching customer by ID', { error, customerId });
            throw new InternalServerError('Database error while fetching customer');
        }
        return data;
    }
    /**
     * Create customer from Google OAuth data
     */
    async createCustomerFromGoogle(googleUser, fcmToken) {
        // Check if email already exists
        const existing = await this.findCustomerByEmail(googleUser.email);
        if (existing) {
            throw new ConflictError('Customer with this email already exists');
        }
        const { data, error } = await supabaseAdmin
            .from('customers')
            .insert({
            email: googleUser.email,
            first_name: googleUser.given_name,
            last_name: googleUser.family_name || null,
            auth_uid: googleUser.id,
            fcm_token: fcmToken || null,
        })
            .select()
            .single();
        if (error) {
            logger.error('Error creating customer', { error, email: googleUser.email });
            throw new InternalServerError('Failed to create customer account');
        }
        // Upload Google profile picture to Cloudinary if available
        if (googleUser.picture) {
            try {
                await this.uploadGoogleProfilePicture(data.customer_id, googleUser.picture);
            }
            catch (err) {
                logger.warn('Failed to upload Google profile picture', { err, customerId: data.customer_id });
                // Don't fail the registration for this
            }
        }
        return data;
    }
    /**
     * Upload Google profile picture to Cloudinary and save to database
     */
    async uploadGoogleProfilePicture(customerId, pictureUrl) {
        // This will be implemented in ImageService
        // For now, we'll just log and skip
        logger.debug('Would upload Google profile picture', { customerId, pictureUrl });
    }
    /**
     * Update customer FCM token
     */
    async updateFcmToken(customerId, fcmToken) {
        const { error } = await supabaseAdmin
            .from('customers')
            .update({ fcm_token: fcmToken })
            .eq('customer_id', customerId);
        if (error) {
            logger.error('Error updating FCM token', { error, customerId });
        }
    }
    /**
     * Get customer profile picture URL
     */
    async getCustomerProfilePicture(customerId) {
        const { data, error } = await supabaseAdmin
            .from('image_entity')
            .select('images(image_url)')
            .eq('entity_id', customerId)
            .eq('entity_category', 'customers')
            .eq('isFeatured', true)
            .single();
        if (error || !data) {
            return null;
        }
        const images = data.images;
        return images?.image_url || null;
    }
    /**
     * Generate access and refresh tokens
     */
    generateTokens(customer) {
        const payload = {
            sub: customer.auth_uid || `customer_${customer.customer_id}`,
            email: customer.email,
            customerId: customer.customer_id,
            firstName: customer.first_name,
            lastName: customer.last_name,
            role: 'customer',
        };
        const accessToken = jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        });
        const refreshPayload = {
            sub: customer.auth_uid || `customer_${customer.customer_id}`,
            customerId: customer.customer_id,
            type: 'refresh',
        };
        const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, {
            expiresIn: config.jwt.refreshExpiresIn,
        });
        // Calculate expiry time (parse the expiresIn string)
        const expiresIn = this.parseExpiryTime(config.jwt.expiresIn);
        return { accessToken, refreshToken, expiresIn };
    }
    /**
     * Verify access token
     */
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
            }
            throw new UnauthorizedError('Invalid token', 'INVALID_TOKEN');
        }
    }
    /**
     * Verify refresh token
     */
    verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, config.jwt.refreshSecret);
            if (decoded.type !== 'refresh') {
                throw new UnauthorizedError('Invalid refresh token');
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError('Refresh token expired');
            }
            throw new UnauthorizedError('Invalid refresh token');
        }
    }
    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        const decoded = this.verifyRefreshToken(refreshToken);
        const customer = await this.findCustomerById(decoded.customerId);
        if (!customer) {
            throw new UnauthorizedError('Customer not found');
        }
        const payload = {
            sub: customer.auth_uid || `customer_${customer.customer_id}`,
            email: customer.email,
            customerId: customer.customer_id,
            firstName: customer.first_name,
            lastName: customer.last_name,
            role: 'customer',
        };
        const accessToken = jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        });
        const expiresIn = this.parseExpiryTime(config.jwt.expiresIn);
        return { accessToken, expiresIn };
    }
    /**
     * Parse expiry time string to seconds
     */
    parseExpiryTime(expiresIn) {
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match) {
            return 3600; // Default 1 hour
        }
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 3600;
            case 'd':
                return value * 86400;
            default:
                return 3600;
        }
    }
    /**
     * Convert JWT payload to AuthUser
     */
    tokenPayloadToAuthUser(payload) {
        return {
            id: payload.sub,
            email: payload.email,
            customerId: payload.customerId,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role,
        };
    }
}
// Export singleton instance
export const authService = new AuthService();
//# sourceMappingURL=auth.service.js.map