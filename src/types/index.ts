import { Request } from 'express';

// ─── Domain Models ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  /** AES-256-GCM encrypted AlRajhi clientId */
  alrajhi_client_id_enc: string | null;
  /** AES-256-GCM encrypted AlRajhi accessToken */
  alrajhi_access_token_enc: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}

// ─── Auth Payloads ───────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;      // user id
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;      // user id
  jti: string;      // unique token id (uuid)
  iat?: number;
  exp?: number;
}

// ─── Request / Response shapes ───────────────────────────────────────────────

export interface RegisterBody {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}

export interface UpdateMeBody {
  fullName?: string;
  alrajhiClientId?: string;
  alrajhiAccessToken?: string;
}

// ─── Safe public user shape (no secrets) ────────────────────────────────────

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  hasAlrajhiCredentials: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Authenticated Request ────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}

// ─── API Response wrappers ───────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Auth response data ───────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;   // seconds until access token expires
}

export interface AuthResponseData {
  user: PublicUser;
  tokens: AuthTokens;
}
