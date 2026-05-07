import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const batchSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'RATE_LIMITED', message: 'Too many batch submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'RATE_LIMITED', message: 'Too many report requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
