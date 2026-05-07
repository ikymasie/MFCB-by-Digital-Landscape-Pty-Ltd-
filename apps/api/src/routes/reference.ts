import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJwt } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { auditLog } from '../middleware/auditLog';
import {
  getReferenceCodesByType,
  createReferenceCode,
  approveReferenceCode,
} from '../services/reference.service';

const router: IRouter = Router();

// ============================================================
// Schemas
// ============================================================

const referenceCreateSchema = z.object({
  code: z.string().min(1).max(20),
  description: z.string().min(1).max(255),
  definition: z.string().optional(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  display_order: z.number().int().optional(),
});

// ============================================================
// GET /reference/:codeType
// ============================================================

router.get(
  '/:codeType',
  authenticateJwt,
  requirePermission('reference:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const codes = await getReferenceCodesByType(req.params.codeType);
      res.json(codes);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /reference/:codeType
// ============================================================

router.post(
  '/:codeType',
  authenticateJwt,
  requirePermission('reference:edit'),
  validateBody(referenceCreateSchema),
  auditLog('REFERENCE_CODE_CREATED', 'CONFIG'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof referenceCreateSchema>;
      const created = await createReferenceCode(req.params.codeType, body, req.user!.id);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /reference/:codeType/:code/approve
// ============================================================

router.post(
  '/:codeType/:code/approve',
  authenticateJwt,
  requirePermission('reference:approve'),
  auditLog('REFERENCE_CODE_APPROVED', 'CONFIG'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await approveReferenceCode(
        req.params.codeType,
        req.params.code,
        req.user!.id
      );

      if (!updated) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Reference code not found',
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

export default router;
