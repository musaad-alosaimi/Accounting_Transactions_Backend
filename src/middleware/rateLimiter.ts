/**
 * Rate limiting middleware configurations.
 *
 * Auth routes  → strict  (RATE_LIMIT_MAX_REQUESTS / RATE_LIMIT_WINDOW_MS)
 * General API  → lenient (5× the auth limit)
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { env } from '../config/env';
import { sendError } from '../utils/responseHelper';

/** Shared handler for rate-limit exceeded responses. */
const rateLimitHandler = (_req: unknown, res: Parameters<typeof sendError>[0]) => {
  sendError(
    res,
    429,
    'TOO_MANY_REQUESTS',
    'Too many requests from this IP. Please wait before retrying.',
    { retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000) }
  );
};

/** Strict limiter for sensitive auth endpoints (register, login, refresh). */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.ip ?? req.socket.remoteAddress ?? 'unknown',
});

/** Slightly more permissive limiter for general API routes. */
export const generalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS * 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => req.ip ?? req.socket.remoteAddress ?? 'unknown',
});
