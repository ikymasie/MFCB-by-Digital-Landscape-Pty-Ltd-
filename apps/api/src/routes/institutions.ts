import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { randomUUID, randomBytes } from 'crypto';
import argon2 from 'argon2';
import { z } from 'zod';
import { db } from '../db/client';
import { config } from '../config';
import { authenticateJwt } from '../middleware/auth';
import { requirePermission, requireInstitutionAccess } from '../middleware/rbac';
import { validateBody, validateQuery } from '../middleware/validate';
import { auditLog } from '../middleware/auditLog';
import { defaultLimiter } from '../middleware/rateLimiter';
import {
  listInstitutions,
  getInstitutionById,
  createInstitution,
  updateInstitution,
  activateInstitution,
  suspendInstitution,
} from '../services/institution.service';

const router: IRouter = Router();

// ============================================================
// Schemas
// ============================================================

const institutionCreateSchema = z.object({
  name: z.string().min(2).max(120),
  supplier_reference_number: z.string().min(4).max(10).toUpperCase(),
  integration_channel: z.enum(['REST_API', 'PORTAL_UPLOAD', 'SFTP']),
  enabled_products: z.array(z.string()).min(1),
  allowed_ip_ranges: z.array(z.string()).optional(),
});

const institutionUpdateSchema = institutionCreateSchema
  .partial()
  .omit({ supplier_reference_number: true })
  .extend({ mtls_cert_fingerprint: z.string().optional() });

const listQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const apiClientCreateSchema = z.object({
  scopes: z.array(z.string()).min(1),
  token_ttl_seconds: z.number().int().min(60).max(86400).optional(),
  expires_at: z.string().datetime().optional(),
});

// ============================================================
// GET /institutions
// ============================================================

router.get(
  '/',
  authenticateJwt,
  requirePermission('institutions:read'),
  defaultLimiter,
  validateQuery(listQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as z.infer<typeof listQuerySchema>;

      // Institution-scoped users only see their own institution
      const institutionId =
        req.user!.institutionId && req.user!.role !== 'SUPER_ADMIN'
          ? req.user!.institutionId
          : undefined;

      const result = await listInstitutions(
        { status: query.status, search: query.search, institutionId },
        { page: query.page, limit: query.limit }
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET /institutions/:institutionId
// ============================================================

router.get(
  '/:institutionId',
  authenticateJwt,
  requirePermission('institutions:read'),
  requireInstitutionAccess(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const institution = await getInstitutionById(req.params.institutionId);

      if (!institution) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Institution not found',
          correlationId: req.correlationId,
        });
        return;
      }

      res.json(institution);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /institutions
// ============================================================

router.post(
  '/',
  authenticateJwt,
  requirePermission('institutions:create'),
  validateBody(institutionCreateSchema),
  auditLog('INSTITUTION_CREATED', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const institution = await createInstitution(req.body as z.infer<typeof institutionCreateSchema>);
      res.status(201).json(institution);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// PATCH /institutions/:institutionId
// ============================================================

router.patch(
  '/:institutionId',
  authenticateJwt,
  requirePermission('institutions:edit'),
  requireInstitutionAccess(),
  validateBody(institutionUpdateSchema),
  auditLog('INSTITUTION_UPDATED', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await updateInstitution(
        req.params.institutionId,
        req.body as z.infer<typeof institutionUpdateSchema>
      );

      if (!updated) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Institution not found',
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
// POST /institutions/:institutionId/activate
// ============================================================

router.post(
  '/:institutionId/activate',
  authenticateJwt,
  requirePermission('institutions:edit'),
  auditLog('INSTITUTION_ACTIVATED', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await activateInstitution(req.params.institutionId, req.user!.id);

      if (!updated) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Institution not found',
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
// POST /institutions/:institutionId/suspend
// ============================================================

router.post(
  '/:institutionId/suspend',
  authenticateJwt,
  requirePermission('institutions:suspend'),
  auditLog('INSTITUTION_SUSPENDED', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await suspendInstitution(req.params.institutionId);

      if (!updated) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Institution not found',
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
// GET /institutions/:institutionId/api-clients
// ============================================================

router.get(
  '/:institutionId/api-clients',
  authenticateJwt,
  requirePermission('api_clients:create'),
  requireInstitutionAccess(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clients = await db('api_clients')
        .where('institution_id', req.params.institutionId)
        .select(
          'client_id',
          'institution_id',
          'scopes',
          'allowed_ip_ranges',
          'token_ttl_seconds',
          'expires_at',
          'status',
          'last_used_at',
          'created_at',
          'created_by'
        )
        .orderBy('created_at', 'desc');

      res.json(clients);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /institutions/:institutionId/api-clients
// ============================================================

router.post(
  '/:institutionId/api-clients',
  authenticateJwt,
  requirePermission('api_clients:create'),
  requireInstitutionAccess(),
  validateBody(apiClientCreateSchema),
  auditLog('API_CLIENT_CREATED', 'CONFIG'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof apiClientCreateSchema>;

      const clientSecret = randomBytes(32).toString('hex');
      const secretHash = await argon2.hash(clientSecret, {
        type: argon2.argon2id,
        memoryCost: config.argon2.memoryCost,
        timeCost: config.argon2.timeCost,
        parallelism: config.argon2.parallelism,
      });

      const clientId = randomUUID();
      const now = new Date();

      await db('api_clients').insert({
        client_id: clientId,
        institution_id: req.params.institutionId,
        client_secret_hash: secretHash,
        scopes: JSON.stringify(body.scopes),
        allowed_ip_ranges: null,
        token_ttl_seconds: body.token_ttl_seconds ?? 3600,
        expires_at: body.expires_at ?? null,
        status: 'ACTIVE',
        last_used_at: null,
        created_at: now,
        created_by: req.user!.id,
      });

      res.status(201).json({
        client_id: clientId,
        client_secret: clientSecret, // Return ONCE — never stored plain
        institution_id: req.params.institutionId,
        scopes: body.scopes,
        token_ttl_seconds: body.token_ttl_seconds ?? 3600,
        expires_at: body.expires_at ?? null,
        status: 'ACTIVE',
        created_at: now,
        message: 'Store the client_secret securely — it will not be shown again',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /institutions/:institutionId/api-clients/:clientId/regenerate
// ============================================================

router.post(
  '/:institutionId/api-clients/:clientId/regenerate',
  authenticateJwt,
  requirePermission('api_clients:regenerate'),
  requireInstitutionAccess(),
  auditLog('API_SECRET_REGENERATED', 'SECURITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, institutionId } = req.params;

      const client = await db('api_clients')
        .where({ client_id: clientId, institution_id: institutionId })
        .first();

      if (!client) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'API client not found',
          correlationId: req.correlationId,
        });
        return;
      }

      const newSecret = randomBytes(32).toString('hex');
      const newHash = await argon2.hash(newSecret, {
        type: argon2.argon2id,
        memoryCost: config.argon2.memoryCost,
        timeCost: config.argon2.timeCost,
        parallelism: config.argon2.parallelism,
      });

      await db('api_clients')
        .where('client_id', clientId)
        .update({ client_secret_hash: newHash });

      res.json({
        client_id: clientId,
        client_secret: newSecret,
        message: 'Store the new client_secret securely — it will not be shown again',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// DELETE /institutions/:institutionId/api-clients/:clientId
// ============================================================

router.delete(
  '/:institutionId/api-clients/:clientId',
  authenticateJwt,
  requirePermission('api_clients:revoke'),
  requireInstitutionAccess(),
  auditLog('API_CLIENT_REVOKED', 'SECURITY'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, institutionId } = req.params;

      const updated = await db('api_clients')
        .where({ client_id: clientId, institution_id: institutionId })
        .update({ status: 'REVOKED' });

      if (!updated) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'API client not found',
          correlationId: req.correlationId,
        });
        return;
      }

      res.json({ message: 'API client revoked' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
