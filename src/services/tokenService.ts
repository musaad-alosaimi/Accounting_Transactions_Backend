/**
 * JWT token issuance, verification, and refresh-token management.
 *
 * Strategy
 * ─────────
 * • Access token  : short-lived (15 min), signed HS256, stateless
 * • Refresh token : long-lived (7 days), signed HS256, stored in DB as SHA-256 hash
 *   On refresh: old token is revoked and a new one is issued (rotation).
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { query } from '../config/database';
import { AccessTokenPayload } from '../types';
import { sha256 } from './cryptoService';

// ─── Access Token ─────────────────────────────────────────────────────────────

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign(
    { sub: payload.sub, email: payload.email },
    env.JWT_ACCESS_SECRET,
    options
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  return decoded as AccessTokenPayload;
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

/** Create a new refresh token, persist its hash, and return the raw value. */
export async function createRefreshToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(48).toString('base64url'); // 64-char URL-safe
  const tokenHash = sha256(rawToken);
  const jti = uuidv4();

  // Calculate expiry from JWT_REFRESH_EXPIRES_IN
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // default 7 days

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked)
     VALUES ($1, $2, $3, $4, false)`,
    [jti, userId, tokenHash, expiresAt]
  );

  // Embed the jti inside the opaque raw token so we can look up the DB record
  // Format:  jti.rawToken  (split on first dot)
  return `${jti}.${rawToken}`;
}

/**
 * Rotate a refresh token:
 *  1. Parse jti from the composite token
 *  2. Validate it exists in DB and is not revoked / expired
 *  3. Revoke old token
 *  4. Issue new refresh token
 *  Returns the userId associated with the token.
 */
export async function rotateRefreshToken(
  compositeToken: string
): Promise<{ userId: string; newRefreshToken: string }> {
  const dotIndex = compositeToken.indexOf('.');
  if (dotIndex === -1) throw new Error('Malformed refresh token');

  const jti = compositeToken.substring(0, dotIndex);
  const rawToken = compositeToken.substring(dotIndex + 1);
  const tokenHash = sha256(rawToken);

  // Fetch and validate
  const { rows } = await query<{
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    revoked: boolean;
  }>(
    `SELECT id, user_id, token_hash, expires_at, revoked
     FROM refresh_tokens
     WHERE id = $1`,
    [jti]
  );

  const record = rows[0];

  if (!record) throw new Error('Refresh token not found');
  if (record.revoked) throw new Error('Refresh token has been revoked');
  if (new Date() > new Date(record.expires_at)) throw new Error('Refresh token has expired');
  if (record.token_hash !== tokenHash) throw new Error('Refresh token hash mismatch');

  // Revoke old
  await query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [jti]);

  // Issue new
  const newRefreshToken = await createRefreshToken(record.user_id);

  return { userId: record.user_id, newRefreshToken };
}

/** Revoke all refresh tokens for a user (logout all devices). */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await query(
    'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false',
    [userId]
  );
}

/** Purge expired tokens (can be run as a scheduled job). */
export async function purgeExpiredTokens(): Promise<number> {
  const result = await query(
    'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = true'
  );
  return result.rowCount ?? 0;
}

/** Parse access token expiry in seconds for client convenience. */
export function accessTokenExpiresInSeconds(): number {
  return 15 * 60; // 15 minutes
}
