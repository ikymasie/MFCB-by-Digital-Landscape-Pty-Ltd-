/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db/client';

export function auditLog(action: string, eventCategory: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (!req.user) return;

      const result = res.statusCode < 400 ? 'SUCCESS' : 'FAILURE';

      db('audit_logs')
        .insert({
          audit_id: randomUUID(),
          actor_id: req.user!.id,
          actor_type: req.user!.type,
          institution_id: req.user!.institutionId ?? null,
          action,
          correlation_id: req.correlationId ?? '',
          ip_address: req.ip ?? '0.0.0.0',
          result,
          event_category: eventCategory,
          timestamp: new Date(),
        })
        .catch((err: Error) => {
          console.error('Audit log insert failed:', err.message);
        });
    });

    next();
  };
}