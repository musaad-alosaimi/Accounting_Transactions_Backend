/**
 * Request validation middleware using express-validator.
 * Centralises all input validation schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { sendError } from '../utils/responseHelper';

/**
 * Run an array of validation chains and send a 400 if any fail.
 * Usage: router.post('/register', ...validate(registerRules()), handler)
 */
export function validate(chains: ValidationChain[]) {
  return [
    ...chains,
    (req: Request, res: Response, next: NextFunction): void => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendError(
          res,
          400,
          'VALIDATION_ERROR',
          'Request validation failed.',
          errors.array().map((e) => ({ field: e.type === 'field' ? e.path : e.type, message: e.msg }))
        );
        return;
      }
      next();
    },
  ];
}

// ─── Validation rule sets ─────────────────────────────────────────────────────

export function registerRules(): ValidationChain[] {
  return [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required.')
      .isEmail().withMessage('Must be a valid email address.')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required.')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
      .matches(/\d/).withMessage('Password must contain at least one digit.')
      .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/)
      .withMessage('Password must contain at least one special character.'),

    body('fullName')
      .trim()
      .notEmpty().withMessage('Full name is required.')
      .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters.'),
  ];
}

export function loginRules(): ValidationChain[] {
  return [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required.')
      .isEmail().withMessage('Must be a valid email address.')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required.'),
  ];
}

export function refreshRules(): ValidationChain[] {
  return [
    body('refreshToken')
      .trim()
      .notEmpty().withMessage('refreshToken is required.'),
  ];
}

export function updateMeRules(): ValidationChain[] {
  return [
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters.'),

    body('alrajhiClientId')
      .optional()
      .trim()
      .notEmpty().withMessage('alrajhiClientId cannot be an empty string.'),

    body('alrajhiAccessToken')
      .optional()
      .trim()
      .notEmpty().withMessage('alrajhiAccessToken cannot be an empty string.'),
  ];
}
