/**
 * JWT authentication middleware.
 * Validates Bearer access tokens and attaches the decoded payload to req.user.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/tokenService';
import { HttpError } from '../utils/responseHelper';
import { AuthenticatedRequest } from '../types';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    HttpError.unauthorized(res, 'Missing or malformed Authorization header. Use: Bearer <token>');
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token verification failed';

    if (message.includes('expired')) {
      HttpError.unauthorized(res, 'Access token has expired. Please refresh your token.');
    } else {
      HttpError.unauthorized(res, 'Invalid access token.');
    }
  }
}
