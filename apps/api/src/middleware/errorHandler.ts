/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.errors,
      correlationId: req.correlationId,
    });
    return;
  }

  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 600) {
    res.status(err.statusCode).json({
      error: err.code ?? 'ERROR',
      message: err.message,
      correlationId: req.correlationId,
      ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: config.nodeEnv === 'development' ? err.message : 'An internal error occurred',
    correlationId: req.correlationId,
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
}

export function createError(statusCode: number, message: string, code: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}