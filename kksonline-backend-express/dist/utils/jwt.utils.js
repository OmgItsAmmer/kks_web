"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_config_ts_1 = require("../config/env.config.ts");
const logger_ts_1 = require("./logger.ts");
const generateToken = (payload) => {
    try {
        return jsonwebtoken_1.default.sign(payload, env_config_ts_1.config.auth.jwtSecret, {
            expiresIn: '45m', // 45 minutes session
        });
    }
    catch (error) {
        logger_ts_1.logger.error('Error generating token', error);
        throw error;
    }
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, env_config_ts_1.config.auth.jwtSecret);
    }
    catch (error) {
        logger_ts_1.logger.error('Error verifying token', error);
        throw new Error('Invalid token');
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=jwt.utils.js.map