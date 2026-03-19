/**
 * Health router.
 *
 *   GET /api/health
 */

import { Router } from 'express';
import { healthCheck } from '../controllers/healthController';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Check service and database health
 * @access  Public
 */
router.get('/', healthCheck);

export default router;
