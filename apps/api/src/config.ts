export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-min-64-chars-placeholder-change-this',
  jwtExpiry: parseInt(process.env.JWT_EXPIRY ?? '3600', 10),
  internalHmacKey: process.env.INTERNAL_HMAC_KEY ?? 'dev-hmac-key-placeholder',
  totpIssuer: process.env.TOTP_ISSUER ?? 'MFCB Platform',
  totpEncryptionKey: process.env.TOTP_ENCRYPTION_KEY ?? 'change-me-32-bytes-aes256-key-here',
  argon2: {
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST ?? '65536', 10),
    timeCost: parseInt(process.env.ARGON2_TIME_COST ?? '3', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM ?? '4', 10),
  },
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://neondb_owner:npg_Uhl4LoVnKZg8@ep-withered-glade-apsk712t-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  email: {
    smtpHost:     process.env.SMTP_HOST     ?? 'mail.mfcb.africa',
    smtpPort:     parseInt(process.env.SMTP_PORT ?? '465', 10),
    fromAddress:  process.env.SMTP_USER     ?? 'no-reply@mfcb.africa',
    smtpPassword: process.env.SMTP_PASSWORD ?? '',
    fromName:     process.env.EMAIL_FROM_NAME ?? 'MF Credit Bureau',
    opsEmail:     process.env.EMAIL_OPS     ?? 'ops@mfcb.africa',
    portalUrl:    process.env.PORTAL_BASE_URL ?? 'https://portal.mfcb.africa',
  },
} as const;
