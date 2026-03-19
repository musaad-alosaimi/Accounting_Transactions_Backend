/**
 * Server entry point.
 * Connects to the database, then starts the HTTP server.
 * Handles graceful shutdown on SIGTERM / SIGINT.
 */

import { createApp } from './app';
import { env } from './config/env';
import { testConnection, closePool } from './config/database';
import logger from './utils/logger';

const app = createApp();

async function startServer(): Promise<void> {
  try {
    // Verify database connectivity before accepting traffic
    await testConnection();

    const server = app.listen(env.PORT, () => {
      logger.info('═══════════════════════════════════════════════════');
      logger.info('   AlRajhi Bank | Transactions — Auth API');
      logger.info('═══════════════════════════════════════════════════');
      logger.info(`  Environment : ${env.NODE_ENV}`);
      logger.info(`  Port        : ${env.PORT}`);
      logger.info(`  CORS origin : ${env.ALLOWED_ORIGIN}`);
      logger.info('═══════════════════════════════════════════════════');
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`[Server] ${signal} received. Starting graceful shutdown…`);

      server.close(async () => {
        logger.info('[Server] HTTP server closed.');
        await closePool();
        logger.info('[Server] Shutdown complete.');
        process.exit(0);
      });

      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('[Server] Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT',  () => void shutdown('SIGINT'));

    // ── Unhandled rejections / exceptions ─────────────────────────────────────
    process.on('unhandledRejection', (reason) => {
      logger.error('[Server] Unhandled Promise Rejection:', { reason });
    });

    process.on('uncaughtException', (err) => {
      logger.error('[Server] Uncaught Exception:', { message: err.message, stack: err.stack });
      process.exit(1);
    });
  } catch (err) {
    logger.error('[Server] Failed to start:', { message: (err as Error).message });
    process.exit(1);
  }
}

void startServer();
