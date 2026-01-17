"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_utils_ts_1 = require("../utils/jwt.utils.ts");
const response_ts_1 = require("../utils/response.ts");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            (0, response_ts_1.sendError)(res, 'No token provided', 401);
            return;
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            (0, response_ts_1.sendError)(res, 'No token provided', 401);
            return;
        }
        const decoded = (0, jwt_utils_ts_1.verifyToken)(token);
        req.user = decoded;
        req.customerId = decoded.customerId;
        next();
    }
    catch (error) {
        return (0, response_ts_1.sendError)(res, 'Invalid token', 401);
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map