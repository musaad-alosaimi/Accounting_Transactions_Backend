-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001: Create users table
-- AlRajhi Bank | Transactions
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pgcrypto for gen_random_uuid() (PostgreSQL 13+ has it built-in via uuid-ossp)
-- For PostgreSQL 14+ use gen_random_uuid() which is built in.

CREATE TABLE IF NOT EXISTS users (
    -- Primary key: UUID v4
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Authentication fields
    email                    VARCHAR(255)  NOT NULL UNIQUE,
    password_hash            VARCHAR(255)  NOT NULL,
    full_name                VARCHAR(100)  NOT NULL,

    -- AlRajhi API credentials stored AES-256-GCM encrypted
    -- Format: base64url( iv[12] || authTag[16] || ciphertext )
    alrajhi_client_id_enc    TEXT          DEFAULT NULL,
    alrajhi_access_token_enc TEXT          DEFAULT NULL,

    -- Account state
    is_active                BOOLEAN       NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Automatically update updated_at on every row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE  users                        IS 'Registered application users for AlRajhi Bank dashboard.';
COMMENT ON COLUMN users.id                     IS 'UUID v4 primary key.';
COMMENT ON COLUMN users.email                  IS 'Unique lowercase email address used for authentication.';
COMMENT ON COLUMN users.password_hash          IS 'bcrypt hash (12 rounds) of the user password.';
COMMENT ON COLUMN users.full_name              IS 'Display name of the user.';
COMMENT ON COLUMN users.alrajhi_client_id_enc  IS 'AES-256-GCM encrypted AlRajhi Bank clientId.';
COMMENT ON COLUMN users.alrajhi_access_token_enc IS 'AES-256-GCM encrypted AlRajhi Bank accessToken.';
COMMENT ON COLUMN users.is_active              IS 'Soft-disable accounts without deleting rows.';
