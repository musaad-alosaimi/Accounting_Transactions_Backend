/**
 * Authentication router.
 *
 * Public routes (rate-limited):
 *   POST   /api/auth/register
 *   POST   /api/auth/login
 *   POST   /api/auth/refresh
 *
 * Protected routes (require valid Bearer access token):
 *   POST   /api/auth/logout
 *   GET    /api/auth/me
 *   PATCH  /api/auth/me
 *   GET    /api/auth/me/credentials
 */

import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import { validate, registerRules, loginRules, refreshRules, updateMeRules } from '../middleware/validate';
import {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  getCredentials,
} from '../controllers/authController';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/register
 * @desc    Create a new user account
 * @access  Public
 * @body    { email, password, fullName }
 */
router.post('/register', authRateLimiter, validate(registerRules()), register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate and receive access + refresh tokens
 * @access  Public
 * @body    { email, password }
 */
router.post('/login', authRateLimiter, validate(loginRules()), login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Exchange a valid refresh token for a new token pair (rotation)
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/refresh', authRateLimiter, validate(refreshRules()), refresh);

// ── Protected ─────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/logout
 * @desc    Revoke all active refresh tokens for the authenticated user
 * @access  Private (Bearer token)
 */
router.post('/logout', authenticate, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get the authenticated user's public profile
 * @access  Private (Bearer token)
 */
router.get('/me', authenticate, getProfile);

/**
 * @route   PATCH /api/auth/me
 * @desc    Update profile and/or save encrypted AlRajhi API credentials
 * @access  Private (Bearer token)
 * @body    { fullName?, alrajhiClientId?, alrajhiAccessToken? }
 */
router.patch('/me', authenticate, validate(updateMeRules()), updateProfile);

/**
 * @route   GET /api/auth/me/credentials
 * @desc    Retrieve decrypted AlRajhi credentials for the authenticated user
 * @access  Private (Bearer token)
 */
router.get('/me/credentials', authenticate, getCredentials);

export default router;
