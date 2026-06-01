import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { config } from './config/env.config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { extractCustomerId } from './middleware/customer.middleware';
import routes from './routes/index';

export const createApp = (): Express => {
  const app: Express = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config.server.isProduction ? undefined : false,
  }));

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.cors.allowedOrigins.includes(origin) || config.server.isDevelopment || config.server.nodeEnv === 'test') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-client-info', 'apikey', 'X-Customer-Id'],
  }));

  app.use(extractCustomerId);
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      error: 'Too many requests, please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === `/api/${config.server.apiVersion}/health`,
  });

  app.use(limiter);

  app.use(`/api/${config.server.apiVersion}`, routes);

  app.get('/', (req, res) => {
    res.json({
      name: 'KKS Online Backend API',
      version: '1.0.0',
      status: 'running',
      documentation: `/api/${config.server.apiVersion}/docs`,
      healthCheck: `/api/${config.server.apiVersion}/health`,
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
