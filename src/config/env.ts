import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function requireEnvNumber(key: string, fallback?: number): number {
  const value = process.env[key];
  if (!value) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a valid number, got: "${value}"`);
  }
  return num;
}

export const env = {
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  PORT: requireEnvNumber('PORT', 3000),

  // Database
  DB_HOST: process.env['DB_HOST'] ?? 'localhost',
  DB_PORT: requireEnvNumber('DB_PORT', 5432),
  DB_NAME: requireEnv('DB_NAME'),
  DB_USER: requireEnv('DB_USER'),
  DB_PASSWORD: requireEnv('DB_PASSWORD'),
  DATABASE_URL: process.env['DATABASE_URL'],

  // JWT
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',

  // Encryption
  ENCRYPTION_KEY: requireEnv('ENCRYPTION_KEY'),

  // CORS
  ALLOWED_ORIGIN: process.env['ALLOWED_ORIGIN'] ?? 'http://localhost:55484',

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: requireEnvNumber('RATE_LIMIT_WINDOW_MS', 900_000),
  RATE_LIMIT_MAX_REQUESTS: requireEnvNumber('RATE_LIMIT_MAX_REQUESTS', 20),

  get isProduction() {
    return this.NODE_ENV === 'production';
  },

  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },
} as const;
