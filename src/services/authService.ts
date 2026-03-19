/**
 * Core authentication business logic.
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { encrypt, decrypt } from './cryptoService';
import {
  signAccessToken,
  createRefreshToken,
  accessTokenExpiresInSeconds,
} from './tokenService';
import {
  User,
  PublicUser,
  AuthResponseData,
  RegisterBody,
  LoginBody,
  UpdateMeBody,
} from '../types';

const BCRYPT_ROUNDS = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    hasAlrajhiCredentials:
      u.alrajhi_client_id_enc !== null && u.alrajhi_access_token_enc !== null,
    isActive: u.is_active,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

async function buildAuthResponse(user: User): Promise<AuthResponseData> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = await createRefreshToken(user.id);

  return {
    user: toPublicUser(user),
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresInSeconds(),
    },
  };
}

// ─── Service methods ──────────────────────────────────────────────────────────

export async function registerUser(body: RegisterBody): Promise<AuthResponseData> {
  const { email, password, fullName } = body;

  // Check duplicate email
  const existing = await query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (existing.rows.length > 0) {
    const err = new Error('An account with this email already exists.');
    (err as NodeJS.ErrnoException).code = 'DUPLICATE_EMAIL';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = uuidv4();

  const { rows } = await query<User>(
    `INSERT INTO users (id, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [id, email.toLowerCase(), passwordHash, fullName]
  );

  const user = rows[0];
  if (!user) throw new Error('Failed to create user record.');

  return buildAuthResponse(user);
}

export async function loginUser(body: LoginBody): Promise<AuthResponseData> {
  const { email, password } = body;

  const { rows } = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = rows[0];

  // Use constant-time compare even when user doesn't exist (prevents timing attacks)
  const dummyHash = '$2b$12$invalidhashpaddingtomatchbcryptlength000000000000000000000';
  const hashToCompare = user?.password_hash ?? dummyHash;
  const isValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isValid) {
    const err = new Error('Invalid email or password.');
    (err as NodeJS.ErrnoException).code = 'INVALID_CREDENTIALS';
    throw err;
  }

  if (!user.is_active) {
    const err = new Error('Account is deactivated. Please contact support.');
    (err as NodeJS.ErrnoException).code = 'ACCOUNT_INACTIVE';
    throw err;
  }

  return buildAuthResponse(user);
}

export async function getMe(userId: string): Promise<PublicUser> {
  const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) {
    const err = new Error('User not found.');
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }
  return toPublicUser(user);
}

export async function updateMe(userId: string, body: UpdateMeBody): Promise<PublicUser> {
  const { fullName, alrajhiClientId, alrajhiAccessToken } = body;

  // Build dynamic SET clause
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let idx = 1;

  if (fullName !== undefined) {
    setClauses.push(`full_name = $${idx++}`);
    params.push(fullName);
  }

  if (alrajhiClientId !== undefined) {
    const enc = encrypt(alrajhiClientId);
    setClauses.push(`alrajhi_client_id_enc = $${idx++}`);
    params.push(enc);
  }

  if (alrajhiAccessToken !== undefined) {
    const enc = encrypt(alrajhiAccessToken);
    setClauses.push(`alrajhi_access_token_enc = $${idx++}`);
    params.push(enc);
  }

  params.push(userId); // WHERE clause param

  const { rows } = await query<User>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );

  const user = rows[0];
  if (!user) {
    const err = new Error('User not found.');
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  return toPublicUser(user);
}

/**
 * Decrypt and return the raw AlRajhi credentials for the authenticated user.
 * Only called when the user explicitly requests their stored credentials.
 */
export async function getDecryptedCredentials(userId: string): Promise<{
  alrajhiClientId: string | null;
  alrajhiAccessToken: string | null;
}> {
  const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) {
    const err = new Error('User not found.');
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }

  return {
    alrajhiClientId: user.alrajhi_client_id_enc ? decrypt(user.alrajhi_client_id_enc) : null,
    alrajhiAccessToken: user.alrajhi_access_token_enc ? decrypt(user.alrajhi_access_token_enc) : null,
  };
}
