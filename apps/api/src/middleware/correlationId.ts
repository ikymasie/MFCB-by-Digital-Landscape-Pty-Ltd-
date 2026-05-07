/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers['x-correlation-id'];
  const correlationId = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}
