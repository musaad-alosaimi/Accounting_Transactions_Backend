/**
 * Global error handling middleware.
 *
 * Catches any error passed via next(err) or thrown in async route handlers
 * and returns a consistent JSON error response.
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { sendError } from '../utils/responseHelper';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Log the full error for observability
  logger.error({
    message: err.message,
    stack: err.stack,
    code: err.code,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  // Map known domain errors to HTTP status codes
  const statusCode = resolveStatus(err);
  const code = resolveCode(err);
  const message = resolveMessage(err, statusCode);

  sendError(res, statusCode, code, message, err.details);
}

function resolveStatus(err: AppError): number {
  if (err.statusCode) return err.statusCode;

  switch (err.code) {
    case 'DUPLICATE_EMAIL':     return 409;
    case 'INVALID_CREDENTIALS': return 401;
    case 'ACCOUNT_INACTIVE':    return 403;
    case 'NOT_FOUND':           return 404;
    case 'VALIDATION_ERROR':    return 400;
    default:                    return 500;
  }
}

function resolveCode(err: AppError): string {
  if (err.code) return err.code;
  return 'INTERNAL_SERVER_ERROR';
}

function resolveMessage(err: AppError, statusCode: number): string {
  // Never expose internal server error details to the client in production
  if (statusCode === 500 && process.env['NODE_ENV'] === 'production') {
    return 'An unexpected error occurred. Please try again later.';
  }
  return err.message || 'An unexpected error occurred.';
}

/**
 * Wrapper for async route handlers to automatically forward errors to next().
 *
 * Usage:
 *   router.get('/me', authenticate, asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
