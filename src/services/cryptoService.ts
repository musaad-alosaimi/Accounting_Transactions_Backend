/**
 * AES-256-GCM symmetric encryption / decryption.
 *
 * Each encrypted value is stored as a single URL-safe base64 string that
 * encodes:   iv (12 bytes) | authTag (16 bytes) | ciphertext
 *
 * The key comes from ENCRYPTION_KEY env var (32-byte hex string → 256 bits).
 */

import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12;       // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

function getDerivedKey(): Buffer {
  const hex = env.ENCRYPTION_KEY;
  if (hex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got length: ${hex.length}`
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string: iv | authTag | ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack: iv || authTag || ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64url');
}

/**
 * Decrypt a base64url-encoded ciphertext produced by `encrypt()`.
 * Throws if the auth tag is invalid (tampered data).
 */
export function decrypt(ciphertext: string): string {
  const key = getDerivedKey();
  const packed = Buffer.from(ciphertext, 'base64url');

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Invalid ciphertext: too short.');
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Safely hash a secret for storage / comparison (one-way).
 * Uses SHA-256 — NOT suitable as a password hash; use bcrypt for passwords.
 */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
