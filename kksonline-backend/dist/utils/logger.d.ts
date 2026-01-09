import winston from 'winston';
export declare const logger: winston.Logger;
export declare const morganStream: {
    write: (message: string) => void;
};
export declare const logRequest: (method: string, path: string, statusCode: number, duration: number) => void;
export declare const logError: (error: Error, context?: Record<string, unknown>) => void;
export declare const logInfo: (message: string, metadata?: Record<string, unknown>) => void;
export declare const logDebug: (message: string, metadata?: Record<string, unknown>) => void;
export declare const logWarn: (message: string, metadata?: Record<string, unknown>) => void;
//# sourceMappingURL=logger.d.ts.map