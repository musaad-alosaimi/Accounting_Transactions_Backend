/**
 * Authentication controller.
 * Handles: register, login, refresh, logout, GET /me, PATCH /me
 */

import { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  getDecryptedCredentials,
} from '../services/authService';
import {
  rotateRefreshToken,
  revokeAllUserTokens,
  signAccessToken,
  accessTokenExpiresInSeconds,
} from '../services/tokenService';
import { sendSuccess, HttpError } from '../utils/responseHelper';
import {
  AuthenticatedRequest,
  RegisterBody,
  LoginBody,
  RefreshBody,
  UpdateMeBody,
} from '../types';

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as RegisterBody;
    const data = await registerUser(body);
    sendSuccess(res, data, 'Account created successfully.', 201);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as LoginBody;
    const data = await loginUser(body);
    sendSuccess(res, data, 'Login successful.');
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshBody;
    if (!refreshToken) {
      HttpError.badRequest(res, 'refreshToken is required.');
      return;
    }

    const { userId, newRefreshToken } = await rotateRefreshToken(refreshToken);

    // We need the user's email to embed in the new access token
    const meData = await getMe(userId);

    const newAccessToken = signAccessToken({ sub: userId, email: meData.email });

    sendSuccess(res, {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: accessTokenExpiresInSeconds(),
      },
    }, 'Tokens refreshed successfully.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    if (
      message.includes('not found') ||
      message.includes('revoked') ||
      message.includes('expired') ||
      message.includes('Malformed') ||
      message.includes('mismatch')
    ) {
      HttpError.unauthorized(res, message);
      return;
    }
    next(err);
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user.sub;
    await revokeAllUserTokens(userId);
    sendSuccess(res, null, 'Logged out successfully. All sessions revoked.');
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user.sub;
    const user = await getMe(userId);
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/auth/me ───────────────────────────────────────────────────────

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user.sub;
    const body = req.body as UpdateMeBody;

    if (!body.fullName && !body.alrajhiClientId && !body.alrajhiAccessToken) {
      HttpError.badRequest(res, 'Provide at least one field to update: fullName, alrajhiClientId, or alrajhiAccessToken.');
      return;
    }

    const user = await updateMe(userId, body);
    sendSuccess(res, { user }, 'Profile updated successfully.');
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/auth/me/credentials ────────────────────────────────────────────
// Returns the decrypted AlRajhi credentials for the authenticated user.
// Consider gating this behind MFA in a production scenario.

export async function getCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user.sub;
    const credentials = await getDecryptedCredentials(userId);
    sendSuccess(res, { credentials });
  } catch (err) {
    next(err);
  }
}
