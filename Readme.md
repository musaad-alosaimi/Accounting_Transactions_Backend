# AlRajhi Bank | Transactions — Backend Auth API

A production-grade **Node.js + Express + TypeScript** authentication backend for the AlRajhi Bank Transactions dashboard.

---

## Features

| Feature | Details |
|---|---|
| **Registration / Login** | bcrypt (12 rounds) password hashing |
| **Access Tokens** | JWT HS256, 15-minute lifetime |
| **Refresh Tokens** | 7-day rotating tokens, stored as SHA-256 hashes in PostgreSQL |
| **Credential Encryption** | AlRajhi `clientId` & `accessToken` encrypted with AES-256-GCM |
| **Rate Limiting** | `express-rate-limit` on all auth routes (20 req / 15 min by default) |
| **Security Headers** | `helmet` with strict CSP, HSTS, X-Frame-Options, etc. |
| **CORS** | Configured for `http://localhost:55484` |
| **Input Validation** | `express-validator` with detailed field-level errors |
| **Global Error Handler** | Consistent `{ success, error: { code, message } }` format |
| **Health Endpoint** | `GET /api/health` with DB latency check |
| **Logging** | Winston (colorised dev / JSON prod) |
| **Graceful Shutdown** | SIGTERM / SIGINT handlers with pool drain |

---

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4
- **Language**: TypeScript 5
- **Database**: PostgreSQL 15+
- **ORM/Query**: `pg` (node-postgres) — raw SQL with a thin wrapper
- **Auth**: `jsonwebtoken`, `bcrypt`
- **Crypto**: Node.js built-in `crypto` (AES-256-GCM)

---

## Project Structure

```
src/
├── config/
│   ├── database.ts        # pg Pool, query helper, transaction wrapper
│   ├── env.ts             # Typed environment variables (fails fast on missing)
│   └── migrate.ts         # Simple SQL migration runner
├── controllers/
│   ├── authController.ts  # register, login, refresh, logout, getMe, updateMe
│   └── healthController.ts
├── middleware/
│   ├── auth.ts            # JWT Bearer token validator
│   ├── errorHandler.ts    # Global error handler + asyncHandler wrapper
│   ├── rateLimiter.ts     # Auth & general rate limiters
│   └── validate.ts        # express-validator rule sets
├── routes/
│   ├── auth.ts            # /api/auth/*
│   └── health.ts          # /api/health
├── services/
│   ├── authService.ts     # Business logic: register, login, getMe, updateMe
│   ├── cryptoService.ts   # AES-256-GCM encrypt / decrypt
│   └── tokenService.ts    # JWT sign/verify, refresh token rotation
├── types/
│   └── index.ts           # Shared TypeScript interfaces
├── utils/
│   ├── logger.ts          # Winston logger
│   └── responseHelper.ts  # sendSuccess / sendError / HttpError helpers
├── app.ts                 # Express app factory
└── server.ts              # Entry point, DB connect, graceful shutdown
migrations/
├── 001_create_users_table.sql
├── 002_create_refresh_tokens_table.sql
└── 003_create_schema_migrations_table.sql
```

---

## Quick Start

### 1. Prerequisites

- Node.js **≥ 20**
- PostgreSQL **≥ 14**
- npm **≥ 9**

### 2. Clone & Install

```bash
git clone <repo-url>
cd Accounting_Transaction_Project_Backend
npm install
```

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```bash
# Generate a 64-char hex JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate a 32-byte AES encryption key (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Required variables:

| Variable | Description |
|---|---|
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_ACCESS_SECRET` | 64-char hex secret for access tokens |
| `JWT_REFRESH_SECRET` | 64-char hex secret for refresh tokens |
| `ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM (32 bytes) |

### 4. Database Setup

```bash
# Create the database (run once)
psql -U postgres -c "CREATE DATABASE alrajhi_transactions;"

# Run migrations
npm run migrate:ts
```

### 5. Start the Server

```bash
# Development (hot-reload)
npm run dev

# Production build
npm run build
npm start
```

---

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Human readable message",
  "timestamp": "2026-03-19T10:00:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [{ "field": "email", "message": "Must be a valid email address." }]
  },
  "timestamp": "2026-03-19T10:00:00.000Z"
}
```

---

### Health

#### `GET /api/health`
Returns server and database status.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "appName": "AlRajhi Bank | Transactions API",
    "environment": "development",
    "uptime": 42,
    "checks": {
      "database": { "status": "ok", "latencyMs": 3 }
    }
  }
}
```

---

### Authentication

#### `POST /api/auth/register`
Create a new account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd!",
  "fullName": "Mohammed Al-Rajhi"
}
```

Password rules: ≥8 chars, uppercase, lowercase, digit, special character.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "fullName": "...", "hasAlrajhiCredentials": false },
    "tokens": {
      "accessToken": "<JWT>",
      "refreshToken": "<opaque-composite-token>",
      "expiresIn": 900
    }
  }
}
```

---

#### `POST /api/auth/login`
Authenticate and receive token pair.

**Body:**
```json
{ "email": "user@example.com", "password": "P@ssw0rd!" }
```

---

#### `POST /api/auth/refresh`
Exchange a refresh token for a new token pair (automatic rotation — old token is immediately revoked).

**Body:**
```json
{ "refreshToken": "<composite-refresh-token>" }
```

---

#### `POST /api/auth/logout` 🔒
Revoke all active refresh tokens for the user (all devices).

**Header:** `Authorization: Bearer <accessToken>`

---

#### `GET /api/auth/me` 🔒
Get the authenticated user's public profile.

**Header:** `Authorization: Bearer <accessToken>`

---

#### `PATCH /api/auth/me` 🔒
Update profile and/or save encrypted AlRajhi API credentials.

**Header:** `Authorization: Bearer <accessToken>`

**Body (all fields optional):**
```json
{
  "fullName": "New Name",
  "alrajhiClientId": "your-alrajhi-client-id",
  "alrajhiAccessToken": "your-alrajhi-access-token"
}
```

`alrajhiClientId` and `alrajhiAccessToken` are encrypted with **AES-256-GCM** before storage. The response never returns the raw values — only `hasAlrajhiCredentials: true/false`.

---

#### `GET /api/auth/me/credentials` 🔒
Retrieve the decrypted AlRajhi credentials for use in API calls.

**Header:** `Authorization: Bearer <accessToken>`

**Response:**
```json
{
  "success": true,
  "data": {
    "credentials": {
      "alrajhiClientId": "your-client-id",
      "alrajhiAccessToken": "your-access-token"
    }
  }
}
```

---

## Security Considerations

- **Refresh tokens** are stored as SHA-256 hashes — raw values never touch the database.
- **Token rotation**: every `/refresh` call invalidates the old token immediately (replay protection).
- **AES-256-GCM** uses a random 96-bit IV per encryption call; auth tag prevents silent tampering.
- **Rate limiting** defaults: 20 requests / 15 min on auth endpoints.
- **Timing-safe** login: bcrypt comparison runs even when the user does not exist (prevents email enumeration via timing).
- **Helmet** sets 15+ security headers including strict HSTS and CSP.

---

## Error Codes

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `BAD_REQUEST` | 400 | Malformed request |
| `UNAUTHORIZED` | 401 | Missing / expired / invalid token |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `FORBIDDEN` | 403 | Account inactive |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## License
MIT
