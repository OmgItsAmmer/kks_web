import type { Response } from 'express';
import type { ErrorCode } from '../types/api.types.js';
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number) => Response;
export declare const sendCreated: <T>(res: Response, data: T, message?: string) => Response;
export declare const sendNoContent: (res: Response) => Response;
export declare const sendPaginated: <T>(res: Response, data: T[], pagination: {
    page: number;
    pageSize: number;
    total: number;
}, message?: string) => Response;
export declare const sendError: (res: Response, message: string, statusCode?: number, errorCode?: ErrorCode) => Response;
export declare const sendValidationError: (res: Response, errors: Record<string, string[]>, message?: string) => Response;
export declare const sendNotFound: (res: Response, message?: string) => Response;
export declare const sendUnauthorized: (res: Response, message?: string) => Response;
export declare const sendForbidden: (res: Response, message?: string) => Response;
export declare const sendConflict: (res: Response, message?: string) => Response;
//# sourceMappingURL=response.d.ts.map