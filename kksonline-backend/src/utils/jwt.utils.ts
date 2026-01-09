import jwt from 'jsonwebtoken';
import { config } from '../config/env.config.ts';
import { logger } from './logger.ts';

export interface TokenPayload {
    id: number;
    email: string;
    role: string;
    customerId?: number;
}

export const generateToken = (payload: TokenPayload): string => {
    try {
        return jwt.sign(payload, config.auth.jwtSecret, {
            expiresIn: '1h',
        });
    } catch (error) {
        logger.error('Error generating token', error);
        throw error;
    }
};

export const verifyToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
    } catch (error) {
        logger.error('Error verifying token', error);
        throw new Error('Invalid token');
    }
};
