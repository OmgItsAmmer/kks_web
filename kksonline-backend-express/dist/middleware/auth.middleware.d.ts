import { type Request, type Response, type NextFunction } from 'express';
import { type TokenPayload } from '../utils/jwt.utils';
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
            customerId?: number;
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map