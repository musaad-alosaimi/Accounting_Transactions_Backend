-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Migration tracking table
-- (Also auto-created by migrate.ts if missing, included here for completeness.)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_migrations (
    id         SERIAL       PRIMARY KEY,
    filename   VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  schema_migrations          IS 'Tracks which SQL migration files have been applied.';
COMMENT ON COLUMN schema_migrations.filename IS 'Filename of the migration script (e.g. 001_create_users_table.sql).';
