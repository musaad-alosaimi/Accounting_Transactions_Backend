import { Pool, PoolClient, QueryResultRow } from 'pg';
import { env } from './env';

// Create a singleton connection pool
const pool = new Pool(
  env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL, ssl: env.isProduction ? { rejectUnauthorized: true } : false }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        ssl: env.isProduction ? { rejectUnauthorized: true } : false,
        max: 20,                  // max pool connections
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      }
);

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

/**
 * Execute a SQL query with optional parameters.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (process.env['NODE_ENV'] === 'development') {
    console.debug(`[DB] query executed in ${duration}ms | rows: ${result.rowCount}`);
  }

  return result;
}

/**
 * Get a raw client from the pool (for transactions).
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Execute a callback inside a database transaction.
 * Automatically commits or rolls back.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Test the database connection.
 */
export async function testConnection(): Promise<void> {
  const result = await query<{ now: string }>('SELECT NOW() AS now');
  console.info(`[DB] Connected ✔  server time: ${result.rows[0]?.now}`);
}

/**
 * Close the pool (used during graceful shutdown).
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.info('[DB] Pool closed.');
}

export default pool;
