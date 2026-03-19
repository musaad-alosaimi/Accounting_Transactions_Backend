-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Create refresh_tokens table
-- AlRajhi Bank | Transactions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
    -- jti (JWT ID) used as primary key — same UUID stored inside the composite token
    id          UUID         PRIMARY KEY,

    -- Owning user
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- SHA-256 hash of the raw random bytes portion of the refresh token.
    -- Never store raw tokens; compare hashes at validation time.
    token_hash  VARCHAR(64)  NOT NULL UNIQUE,

    -- Expiry time mirrors JWT_REFRESH_EXPIRES_IN (7 days)
    expires_at  TIMESTAMPTZ  NOT NULL,

    -- Rotation: once used, old token is immediately revoked
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Audit
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup patterns
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at)
    WHERE revoked = FALSE;

-- Comments
COMMENT ON TABLE  refresh_tokens             IS 'Persisted refresh tokens for JWT rotation. Hashed — raw values never stored.';
COMMENT ON COLUMN refresh_tokens.id          IS 'jti (JWT ID) — UUID v4 embedded in the composite token string.';
COMMENT ON COLUMN refresh_tokens.user_id     IS 'Foreign key to users.id. Cascade-delete when user is removed.';
COMMENT ON COLUMN refresh_tokens.token_hash  IS 'SHA-256 hex hash of the raw random token suffix.';
COMMENT ON COLUMN refresh_tokens.expires_at  IS 'Absolute expiry timestamp. Checked at validation time.';
COMMENT ON COLUMN refresh_tokens.revoked     IS 'TRUE once the token has been used or the user has logged out.';
