/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface PortalJwtPayload {
  sub: string;
  type: 'PORTAL';
  role: string;
  institutionId: string | null;
  permissions: string[];
}

interface ApiClientJwtPayload {
  sub: string;
  type: 'API_CLIENT';
  institutionId: string;
  permissions: string[];
}

type JwtPayload = PortalJwtPayload | ApiClientJwtPayload;

export function authenticateJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or missing token',
      correlationId: req.correlationId,
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;

    if (payload.type === 'PORTAL') {
      req.user = {
        id: payload.sub,
        type: 'USER',
        role: payload.role,
        institutionId: payload.institutionId,
        permissions: payload.permissions,
      };
    } else if (payload.type === 'API_CLIENT') {
      req.user = {
        id: payload.sub,
        type: 'API_CLIENT',
        role: 'API_CLIENT',
        institutionId: payload.institutionId,
        permissions: payload.permissions,
      };
    } else {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or missing token',
        correlationId: req.correlationId,
      });
      return;
    }

    next();
  } catch {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or missing token',
      correlationId: req.correlationId,
    });
  }
}