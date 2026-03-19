/**
 * Simple migration runner.
 * Reads SQL files from /migrations in order and executes them.
 * Tracks applied migrations in a `schema_migrations` table.
 *
 * Usage:  npm run migrate:ts
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool(
  process.env['DATABASE_URL']
    ? { connectionString: process.env['DATABASE_URL'] }
    : {
        host: process.env['DB_HOST'] ?? 'localhost',
        port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
        database: process.env['DB_NAME'],
        user: process.env['DB_USER'],
        password: process.env['DB_PASSWORD'],
      }
);

async function run(): Promise<void> {
  const client = await pool.connect();
  console.log('[Migrate] Connected to database.');

  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (rows.length > 0) {
        console.log(`[Migrate] ✔ Already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`[Migrate] ▶ Applying: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[Migrate] ✔ Applied:  ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('[Migrate] All migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[Migrate] Error:', err.message);
  process.exit(1);
});
