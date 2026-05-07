import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticateJwt } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody, validateQuery } from '../middleware/validate';
import { auditLog } from '../middleware/auditLog';
import { batchSubmitLimiter } from '../middleware/rateLimiter';

const router: IRouter = Router();

// ============================================================
// Schemas
// ============================================================

const listBatchesQuerySchema = z.object({
  institutionId: z.string().uuid().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: z.string().optional(),
  to: z.string().optional(),
});

const batchSubmitSchema = z.object({
  institution_id: z.string().uuid(),
  reporting_month: z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM format'),
  file_type: z.enum(['TEST', 'LIVE']),
  records: z.array(z.record(z.unknown())).min(1),
});

const errorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  severity: z.enum(['REJECT', 'WARN']).optional(),
  code: z.string().optional(),
});

// ============================================================
// GET /batches
// ============================================================

router.get(
  '/',
  authenticateJwt,
  requirePermission('batches:read'),
  validateQuery(listBatchesQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as z.infer<typeof listBatchesQuerySchema>;
      const { page, limit } = query;
      const offset = (page - 1) * limit;

      let dbQuery = db('batch_uploads').select('*');
      let countQuery = db('batch_uploads').count('batch_id as count');

      // Institution isolation
      const institutionId =
        req.user!.institutionId ?? query.institutionId;

      if (institutionId) {
        dbQuery = dbQuery.where('institution_id', institutionId);
        countQuery = countQuery.where('institution_id', institutionId);
      } else if (query.institutionId) {
        dbQuery = dbQuery.where('institution_id', query.institutionId);
        countQuery = countQuery.where('institution_id', query.institutionId);
      }

      if (query.status) {
        dbQuery = dbQuery.where('status', query.status);
        countQuery = countQuery.where('status', query.status);
      }

      if (query.from) {
        dbQuery = dbQuery.where('queued_at', '>=', query.from);
        countQuery = countQuery.where('queued_at', '>=', query.from);
      }

      if (query.to) {
        dbQuery = dbQuery.where('queued_at', '<=', query.to);
        countQuery = countQuery.where('queued_at', '<=', query.to);
      }

      const [data, countResult] = await Promise.all([
        dbQuery.orderBy('queued_at', 'desc').limit(limit).offset(offset),
        countQuery.first(),
      ]);

      const total = parseInt(String((countResult as { count: string })?.count ?? '0'), 10);

      res.json({ data, total, page, limit });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET /batches/:batchId
// ============================================================

router.get(
  '/:batchId',
  authenticateJwt,
  requirePermission('batches:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await db('batch_uploads')
        .where('batch_id', req.params.batchId)
        .first();

      if (!batch) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Batch not found',
          correlationId: req.correlationId,
        });
        return;
      }

      // Institution isolation
      if (req.user!.institutionId && batch.institution_id !== req.user!.institutionId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          correlationId: req.correlationId,
        });
        return;
      }

      res.json(batch);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET /batches/:batchId/errors
// ============================================================

router.get(
  '/:batchId/errors',
  authenticateJwt,
  requirePermission('batches:errors:read'),
  validateQuery(errorsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as z.infer<typeof errorsQuerySchema>;

      // Institution isolation — verify batch ownership
      const batch = await db('batch_uploads')
        .where('batch_id', req.params.batchId)
        .first();

      if (!batch) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Batch not found',
          correlationId: req.correlationId,
        });
        return;
      }

      if (req.user!.institutionId && batch.institution_id !== req.user!.institutionId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          correlationId: req.correlationId,
        });
        return;
      }

      const { page, limit } = query;
      const offset = (page - 1) * limit;

      let errorsQuery = db('validation_errors')
        .where('batch_id', req.params.batchId)
        .select('*');
      let countQuery = db('validation_errors')
        .where('batch_id', req.params.batchId)
        .count('error_id as count');

      if (query.severity) {
        errorsQuery = errorsQuery.where('severity', query.severity);
        countQuery = countQuery.where('severity', query.severity);
      }

      if (query.code) {
        errorsQuery = errorsQuery.where('code', query.code);
        countQuery = countQuery.where('code', query.code);
      }

      const [data, countResult] = await Promise.all([
        errorsQuery.orderBy('row_number', 'asc').limit(limit).offset(offset),
        countQuery.first(),
      ]);

      const total = parseInt(String((countResult as { count: string })?.count ?? '0'), 10);

      res.json({ data, total, page, limit });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET /batches/:batchId/accepted
// ============================================================

router.get(
  '/:batchId/accepted',
  authenticateJwt,
  requirePermission('batches:accepted:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await db('batch_uploads')
        .where('batch_id', req.params.batchId)
        .first();

      if (!batch) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Batch not found',
          correlationId: req.correlationId,
        });
        return;
      }

      if (req.user!.institutionId && batch.institution_id !== req.user!.institutionId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          correlationId: req.correlationId,
        });
        return;
      }

      const records = await db('raw_submission_records')
        .where('batch_id', req.params.batchId)
        .select('*')
        .orderBy('row_number', 'asc');

      res.json(records);
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /batches
// ============================================================

router.post(
  '/',
  authenticateJwt,
  requirePermission('batches:submit'),
  batchSubmitLimiter,
  validateBody(batchSubmitSchema),
  auditLog('BATCH_SUBMITTED', 'DATA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      if (!idempotencyKey) {
        res.status(400).json({
          error: 'MISSING_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key header is required',
          correlationId: req.correlationId,
        });
        return;
      }

      const body = req.body as z.infer<typeof batchSubmitSchema>;

      // Institution isolation
      if (req.user!.institutionId && body.institution_id !== req.user!.institutionId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Cannot submit batch for a different institution',
          correlationId: req.correlationId,
        });
        return;
      }

      // Idempotency check
      const existing = await db('batch_uploads')
        .where('idempotency_key', idempotencyKey)
        .first();

      if (existing) {
        res.json({
          batch_id: existing.batch_id,
          status: existing.status,
          message: 'Batch already submitted',
        });
        return;
      }

      const batchId = randomUUID();
      const now = new Date();

      await db('batch_uploads').insert({
        batch_id: batchId,
        institution_id: body.institution_id,
        supplier_reference_number: '',
        reporting_month: body.reporting_month,
        file_type: body.file_type,
        sequence_number: 0,
        idempotency_key: idempotencyKey,
        source_file_name: null,
        file_hash_sha256: null,
        file_size_bytes: null,
        channel: 'REST_API',
        status: 'QUEUED',
        stage: 'QUEUED',
        total_records: body.records.length,
        accepted_count: null,
        rejected_count: null,
        warning_count: null,
        header_supplier_ref: null,
        header_month_end: null,
        header_version: null,
        header_file_creation_date: null,
        trailer_record_count: null,
        queued_at: now,
        started_at: null,
        completed_at: null,
        submitted_by_user_id: req.user!.type === 'USER' ? req.user!.id : null,
        submitted_by_client_id: req.user!.type === 'API_CLIENT' ? req.user!.id : null,
        correlation_id: req.correlationId ?? randomUUID(),
        created_at: now,
      });

      res.status(202).json({
        batch_id: batchId,
        status: 'QUEUED',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// POST /batches/:batchId/retry
// ============================================================

router.post(
  '/:batchId/retry',
  authenticateJwt,
  requirePermission('batches:force_retry'),
  auditLog('BATCH_RETRIED', 'DATA'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batch = await db('batch_uploads')
        .where('batch_id', req.params.batchId)
        .first();

      if (!batch) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Batch not found',
          correlationId: req.correlationId,
        });
        return;
      }

      if (req.user!.institutionId && batch.institution_id !== req.user!.institutionId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          correlationId: req.correlationId,
        });
        return;
      }

      await db('batch_uploads')
        .where('batch_id', req.params.batchId)
        .update({ status: 'QUEUED', stage: 'QUEUED' });

      res.json({ batch_id: req.params.batchId, status: 'QUEUED' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
