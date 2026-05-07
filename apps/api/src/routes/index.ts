import { Express } from 'express';
import authRouter from './auth';
import oauthRouter from './oauth';
import institutionRouter from './institutions';
import userRouter from './users';
import referenceRouter from './reference';
import batchRouter from './batches';
import reportRouter from './reports';

export function mountRoutes(app: Express): void {
  app.use('/v1/auth', authRouter);
  app.use('/v1/oauth', oauthRouter);
  app.use('/v1/institutions', institutionRouter);
  app.use('/v1/users', userRouter);
  app.use('/v1/reference', referenceRouter);
  app.use('/v1/batches', batchRouter);
  app.use('/v1/reports', reportRouter);
}
