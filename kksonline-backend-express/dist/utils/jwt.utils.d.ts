export interface TokenPayload {
    id: number;
    email: string;
    role: string;
    customerId?: number;
}
export declare const generateToken: (payload: TokenPayload) => string;
export declare const verifyToken: (token: string) => TokenPayload;
//# sourceMappingURL=jwt.utils.d.ts.map