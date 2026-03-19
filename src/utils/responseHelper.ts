import { Response } from 'express';
import { ApiSuccess, ApiError } from '../types';

/**
 * Send a standardised success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): void {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(message && { message }),
  };
  res.status(statusCode).json(body);
}

/**
 * Send a standardised error response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const body: ApiError = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(body);
}

/**
 * Common HTTP error helpers.
 */
export const HttpError = {
  badRequest:   (res: Response, message: string, details?: unknown) =>
    sendError(res, 400, 'BAD_REQUEST', message, details),

  unauthorized: (res: Response, message = 'Unauthorized') =>
    sendError(res, 401, 'UNAUTHORIZED', message),

  forbidden:    (res: Response, message = 'Forbidden') =>
    sendError(res, 403, 'FORBIDDEN', message),

  notFound:     (res: Response, message = 'Resource not found') =>
    sendError(res, 404, 'NOT_FOUND', message),

  conflict:     (res: Response, message: string) =>
    sendError(res, 409, 'CONFLICT', message),

  tooManyRequests: (res: Response, message = 'Too many requests. Please try again later.') =>
    sendError(res, 429, 'TOO_MANY_REQUESTS', message),

  internal:     (res: Response, message = 'An internal server error occurred') =>
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', message),
};
