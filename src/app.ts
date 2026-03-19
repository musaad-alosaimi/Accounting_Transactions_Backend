/**
 * Express application factory.
 * Wires together all middleware, routes, and error handling.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { generalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { sendError } from './utils/responseHelper';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import logger from './utils/logger';

export function createApp(): Application {
  const app = express();

  // ── Trust proxy (needed for rate limiter IP detection behind load balancers) ──
  app.set('trust proxy', 1);

  // ── Security headers ──────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true,
    })
  );

  // ── CORS ──────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl in dev)
        if (!origin) return callback(null, true);
        if (origin === env.ALLOWED_ORIGIN) return callback(null, true);
        logger.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error(`CORS policy: origin "${origin}" is not allowed.`));
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      credentials: true,
      maxAge: 86_400, // cache preflight for 24 hours
    })
  );

  // ── Body parsers ──────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  // ── Global rate limiter (all API routes) ──────────────────────────────────────
  app.use('/api', generalRateLimiter);

  // ── Request logging ───────────────────────────────────────────────────────────
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`→ ${req.method} ${req.originalUrl}  [${req.ip}]`);
    next();
  });

  // ── Routes ────────────────────────────────────────────────────────────────────
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);

  // ── 404 handler ───────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    sendError(res, 404, 'NOT_FOUND', 'The requested endpoint does not exist.');
  });

  // ── Global error handler ──────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
