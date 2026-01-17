import { type Request, type Response, type NextFunction } from 'express';
import { type TokenPayload } from '../utils/jwt.utils.ts';
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
            customerId?: number;
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.middleware.d.ts.map