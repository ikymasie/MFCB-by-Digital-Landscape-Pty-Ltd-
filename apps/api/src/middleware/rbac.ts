/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';

const PLATFORM_ROLES = ['SUPER_ADMIN', 'BUREAU_OPS', 'COMPLIANCE', 'AUDITOR'];
const INSTITUTION_ROLES = ['INST_ADMIN', 'INST_USER'];

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        correlationId: req.correlationId,
      });
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
        correlationId: req.correlationId,
      });
      return;
    }

    // Institution isolation for institution-scoped roles
    if (INSTITUTION_ROLES.includes(req.user.role) && req.user.institutionId) {
      const paramInstitutionId =
        req.params.institutionId ||
        (req.body as Record<string, unknown>)?.institution_id as string | undefined ||
        (req.query.institutionId as string | undefined);

      if (paramInstitutionId && paramInstitutionId !== req.user.institutionId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          correlationId: req.correlationId,
        });
        return;
      }
    }

    next();
  };
}

export function requireInstitutionAccess() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        correlationId: req.correlationId,
      });
      return;
    }

    // Platform roles pass through
    if (PLATFORM_ROLES.includes(req.user.role)) {
      next();
      return;
    }

    // Institution-scoped roles must match
    const paramInstitutionId = req.params.institutionId;
    if (paramInstitutionId && req.user.institutionId !== paramInstitutionId) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
        correlationId: req.correlationId,
      });
      return;
    }

    next();
  };
}