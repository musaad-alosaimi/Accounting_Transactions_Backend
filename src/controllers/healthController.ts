/**
 * Health check controller.
 * GET /api/health — returns server and database status.
 */

import { Request, Response } from 'express';
import { query } from '../config/database';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { env } from '../config/env';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  let dbStatus: 'ok' | 'error' = 'error';
  let dbLatencyMs = 0;
  let dbError: string | undefined;

  try {
    const t0 = Date.now();
    await query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
    dbStatus = 'ok';
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'Unknown database error';
  }

  const totalMs = Date.now() - startTime;
  const overallStatus = dbStatus === 'ok' ? 'ok' : 'degraded';

  const payload = {
    status: overallStatus,
    appName: 'AlRajhi Bank | Transactions API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    responseTimeMs: totalMs,
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError && { error: dbError }),
      },
    },
  };

  if (overallStatus === 'ok') {
    sendSuccess(res, payload, 'Service is healthy.');
  } else {
    sendError(res, 503, 'SERVICE_DEGRADED', 'One or more checks failed.', payload);
  }
}
