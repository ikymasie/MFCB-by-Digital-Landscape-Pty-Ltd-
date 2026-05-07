import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticateJwt } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { auditLog } from '../middleware/auditLog';
import {
  listUsers,
  getUserById,
  inviteUser,
  updateUser,
  resetUserMfa,
} from '../services/user.service';

const router: IRouter = Router();

// ============================================================
// Schemas
// ============================================================

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(120),
  role_id: z.string().uuid(),
  institution_id: z.string().uuid().optional().nullable(),
});

const updateUserSchema = z.object({
  full_name: z.string().min(2).max(120).optional(),
  role_id: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'LOCKED', 'INACTIVE']).optional(),
});

// ============================================================
// GET /users
// ============================================================

router.get(
  '/',
  authenticateJwt,
  requirePermission('users:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const institutionId =
        req.user!.institutionId
          ? req.user!.institutionId
          : (req.query.institutionId as string | undefined) ?? null;

      const users = await listUsers({ institutionId });
      res.json(users);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET /users/:userId
// ============================================================

router.get(
  '/:userId',
  authenticateJwt,
  requirePermission('users:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getUserById(req.params.userId);

      if (!user) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'User not found',
          correlationId: req.correlationId,
        });
        return;
      }

      // Institution isolation
      if (
        req.user!.institutionId &&
        user.institution_id !== req.user!.institutionId
      ) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          correlationId: req.correlationId,
        });
        return;
      }

      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /users/invite
// ============================================================

router.post(
  '/invite',
  authenticateJwt,
  requirePermission('users:create'),
  validateBody(inviteSchema),
  auditLog('USER_INVITED', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof inviteSchema>;

      // INST_ADMIN can only invite INST_USER to own institution
      if (req.user!.role === 'INST_ADMIN') {
        const institutionId = body.institution_id ?? req.user!.institutionId;
        if (institutionId !== req.user!.institutionId) {
          res.status(403).json({
            error: 'FORBIDDEN',
            message: 'INST_ADMIN can only invite users to their own institution',
            correlationId: req.correlationId,
          });
          return;
        }

        // Verify the role is INST_USER
        const role = await db('roles').where('role_id', body.role_id).first();
        if (!role || role.role_name !== 'INST_USER') {
          res.status(403).json({
            error: 'FORBIDDEN',
            message: 'INST_ADMIN can only invite users with INST_USER role',
            correlationId: req.correlationId,
          });
          return;
        }
      }

      const institution_id =
        body.institution_id ??
        (req.user!.institutionId ? req.user!.institutionId : null);

      const result = await inviteUser({
        email: body.email,
        full_name: body.full_name,
        role_id: body.role_id,
        institution_id,
        invited_by: req.user!.id,
      });

      res.status(201).json({
        user_id: result.user_id,
        email: result.email,
        message: 'Invitation created',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// PATCH /users/:userId
// ============================================================

router.patch(
  '/:userId',
  authenticateJwt,
  requirePermission('users:edit'),
  validateBody(updateUserSchema),
  auditLog('USER_UPDATED', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Institution isolation for INST_ADMIN
      if (req.user!.institutionId) {
        const existing = await getUserById(req.params.userId);
        if (!existing) {
          res.status(404).json({
            error: 'NOT_FOUND',
            message: 'User not found',
            correlationId: req.correlationId,
          });
          return;
        }
        if (existing.institution_id !== req.user!.institutionId) {
          res.status(403).json({
            error: 'FORBIDDEN',
            message: 'Insufficient permissions',
            correlationId: req.correlationId,
          });
          return;
        }
      }

      const updated = await updateUser(
        req.params.userId,
        req.body as z.infer<typeof updateUserSchema>
      );

      if (!updated) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'User not found',
          correlationId: req.correlationId,
        });
        return;
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /users/:userId/mfa-reset
// ============================================================

router.post(
  '/:userId/mfa-reset',
  authenticateJwt,
  requirePermission('users:mfa_reset'),
  auditLog('MFA_RESET', 'SECURITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Institution isolation
      if (req.user!.institutionId) {
        const existing = await getUserById(req.params.userId);
        if (!existing) {
          res.status(404).json({
            error: 'NOT_FOUND',
            message: 'User not found',
            correlationId: req.correlationId,
          });
          return;
        }
        if (existing.institution_id !== req.user!.institutionId) {
          res.status(403).json({
            error: 'FORBIDDEN',
            message: 'Insufficient permissions',
            correlationId: req.correlationId,
          });
          return;
        }
      }

      await resetUserMfa(req.params.userId);
      res.json({ message: 'MFA reset successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
