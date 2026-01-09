import { type Request, type Response, type NextFunction } from 'express';
import { verifyToken, type TokenPayload } from '../utils/jwt.utils.ts';
import { sendError } from '../utils/response.ts';

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
            customerId?: number;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            sendError(res, 'No token provided', 401);
            return;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            sendError(res, 'No token provided', 401);
            return;
        }

        const decoded = verifyToken(token);

        req.user = decoded;
        req.customerId = decoded.customerId;

        next();
    } catch (error) {
        return sendError(res, 'Invalid token', 401);
    }
};
