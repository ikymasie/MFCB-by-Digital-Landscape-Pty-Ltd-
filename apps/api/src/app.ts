import express from 'express';
import cors from 'cors';
import { correlationIdMiddleware } from './middleware/correlationId';
import { defaultLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { mountRoutes } from './routes';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
  .split(',')
  .map(o => o.trim());

export function createApp(): express.Express {
  const app = express();

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'Idempotency-Key'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(correlationIdMiddleware);
  app.use(defaultLimiter);

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  mountRoutes(app);
  app.use(errorHandler);

  return app;
}
