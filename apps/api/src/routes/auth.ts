import { Router, IRouter, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { z } from 'zod';
import { db } from '../db/client';
import { config } from '../config';
import { authLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { auditLog } from '../middleware/auditLog';
import {
  loginStep1,
  verifyMfaAndIssueToken,
  enrollMfa,
  confirmMfaEnrollment,
  skipMfaEnrollment,
} from '../services/auth.service';

const router: IRouter = Router();

// ============================================================
// Schemas
// ============================================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyMfaSchema = z.object({
  partial_token: z.string(),
  totp_code: z.string().min(6).max(8),
});

const enrollMfaSchema = z.object({
  partial_token: z.string(),
});

const confirmMfaSchema = z.object({
  partial_token: z.string(),
  totp_code: z.string().min(6).max(8),
  secret: z.string().min(16),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/;
const passwordResetConfirmSchema = z.object({
  token: z.string(),
  new_password: z.string().regex(
    passwordStrengthRegex,
    'Password must be at least 12 chars and contain upper, lower, digit, and special character'
  ),
});

// ============================================================
// POST /auth/login
// ============================================================

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const result = await loginStep1(email, password);

      if (!result) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Invalid email or password',
          correlationId: req.correlationId,
        });
        return;
      }

      res.json({
        partial_token: result.partial_token,
        next_step: result.next_step,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /auth/login/verify-mfa
// ============================================================

router.post(
  '/login/verify-mfa',
  authLimiter,
  validateBody(verifyMfaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { partial_token, totp_code } = req.body as z.infer<typeof verifyMfaSchema>;
      const access_token = await verifyMfaAndIssueToken(partial_token, totp_code);

      res.json({
        access_token,
        token_type: 'Bearer',
        expires_in: config.jwtExpiry,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /auth/mfa/enroll
// ============================================================

router.post(
  '/mfa/enroll',
  validateBody(enrollMfaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { partial_token } = req.body as z.infer<typeof enrollMfaSchema>;
      const result = await enrollMfa(partial_token);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /auth/mfa/confirm
// ============================================================

router.post(
  '/mfa/confirm',
  validateBody(confirmMfaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { partial_token, totp_code, secret } = req.body as z.infer<typeof confirmMfaSchema>;
      const access_token = await confirmMfaEnrollment(partial_token, totp_code, secret);

      res.json({
        access_token,
        token_type: 'Bearer',
        expires_in: config.jwtExpiry,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /auth/password-reset/request
// ============================================================

router.post(
  '/password-reset/request',
  authLimiter,
  validateBody(passwordResetRequestSchema),
  auditLog('PASSWORD_RESET_REQUESTED', 'AUTH'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as z.infer<typeof passwordResetRequestSchema>;

      // Always return success to prevent enumeration
      const user = await db('users')
        .whereRaw('LOWER(email) = ?', [email.toLowerCase()])
        .first();

      if (user) {
        const resetToken = jwt.sign(
          { sub: user.user_id, type: 'PWD_RESET' },
          config.jwtSecret,
          { expiresIn: 3600 }
        );
        // In production, send via email
        console.log(`[PASSWORD_RESET] Token for ${email}: ${resetToken}`);
      }

      res.json({
        message: 'If the email exists, a reset link has been sent',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /auth/password-reset/confirm
// ============================================================

router.post(
  '/password-reset/confirm',
  validateBody(passwordResetConfirmSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, new_password } = req.body as z.infer<typeof passwordResetConfirmSchema>;

      let payload: jwt.JwtPayload;
      try {
        payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
      } catch {
        res.status(400).json({
          error: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
          correlationId: req.correlationId,
        });
        return;
      }

      if (payload.type !== 'PWD_RESET') {
        res.status(400).json({
          error: 'INVALID_TOKEN',
          message: 'Invalid token type',
          correlationId: req.correlationId,
        });
        return;
      }

      const passwordHash = await argon2.hash(new_password, {
        type: argon2.argon2id,
        memoryCost: config.argon2.memoryCost,
        timeCost: config.argon2.timeCost,
        parallelism: config.argon2.parallelism,
      });

      await db('users').where('user_id', payload.sub).update({
        password_hash: passwordHash,
        updated_at: new Date(),
      });

      res.json({ message: 'Password updated' });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /auth/mfa/skip
// ============================================================

router.post(
  '/mfa/skip',
  validateBody(enrollMfaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { partial_token } = req.body as { partial_token: string };
      const access_token = await skipMfaEnrollment(partial_token);
      res.json({ access_token, token_type: 'Bearer', expires_in: config.jwtExpiry });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
