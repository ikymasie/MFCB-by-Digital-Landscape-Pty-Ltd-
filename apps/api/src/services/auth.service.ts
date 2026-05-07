import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { authenticator } from 'otplib';
import { db } from '../db/client';
import { config } from '../config';

// ============================================================
// Types
// ============================================================

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role_id: string;
  institution_id: string | null;
  mfa_enrolled: boolean;
  mfa_secret_encrypted: string | null;
  status: string;
  failed_login_count: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  role_name: string;
  permissions: string[];
}

interface ApiClientWithPermissions {
  client_id: string;
  institution_id: string;
  token_ttl_seconds: number;
  permissions: string[];
}

// ============================================================
// AES-256-CBC encryption for TOTP secrets
// ============================================================

function getEncryptionKey(): Buffer {
  const keyStr = config.totpEncryptionKey;
  const keyBuf = Buffer.alloc(32);
  Buffer.from(keyStr, 'utf8').copy(keyBuf);
  return keyBuf;
}

export function encryptTotpSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTotpSecret(encrypted: string): string {
  const [ivHex, ciphertextHex] = encrypted.split(':');
  if (!ivHex || !ciphertextHex) {
    throw new Error('Invalid encrypted secret format');
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

// ============================================================
// JWT token issuance
// ============================================================

export function issuePortalToken(user: UserWithRole): string {
  return jwt.sign(
    {
      sub: user.user_id,
      type: 'PORTAL',
      role: user.role_name,
      institutionId: user.institution_id,
      permissions: user.permissions,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiry }
  );
}

export function issueApiClientToken(client: ApiClientWithPermissions): string {
  return jwt.sign(
    {
      sub: client.client_id,
      type: 'API_CLIENT',
      institutionId: client.institution_id,
      permissions: client.permissions,
    },
    config.jwtSecret,
    { expiresIn: client.token_ttl_seconds }
  );
}

// ============================================================
// Dummy hash for timing-safe login failures
// ============================================================
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHR2YWx1ZXh4$' +
  'dGVzdGhhc2h2YWx1ZXh4eHh4eHh4eHh4eHh4eHh4eHh4eHg=';

// ============================================================
// Login step 1 — email + password
// ============================================================

export async function loginStep1(
  email: string,
  password: string
): Promise<{ partial_token: string; next_step: 'VERIFY_MFA' | 'ENROLL_MFA' } | null> {
  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.role_id')
    .whereRaw('LOWER(users.email) = ?', [email.toLowerCase()])
    .select('users.*', 'roles.role_name')
    .first();

  if (!user) {
    // Timing-safe: verify dummy hash anyway
    await argon2.verify(DUMMY_HASH, password).catch(() => {});
    return null;
  }

  // Check if account is locked
  if (user.status === 'LOCKED' && user.locked_until && new Date(user.locked_until) > new Date()) {
    const err = new Error('Account is temporarily locked') as Error & { statusCode: number; code: string };
    err.statusCode = 423;
    err.code = 'ACCOUNT_LOCKED';
    throw err;
  }

  // Verify password
  let passwordValid = false;
  try {
    passwordValid = await argon2.verify(user.password_hash, password, {
      memoryCost: config.argon2.memoryCost,
      timeCost: config.argon2.timeCost,
      parallelism: config.argon2.parallelism,
    });
  } catch {
    passwordValid = false;
  }

  if (!passwordValid) {
    // Increment failed login count
    const newCount = (user.failed_login_count ?? 0) + 1;
    const updateData: Record<string, unknown> = { failed_login_count: newCount };
    if (newCount >= 5) {
      updateData.status = 'LOCKED';
      updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000);
    }
    await db('users').where('user_id', user.user_id).update(updateData);
    return null;
  }

  // Reset failed count and update last login
  await db('users').where('user_id', user.user_id).update({
    failed_login_count: 0,
    last_login_at: new Date(),
    status: user.status === 'LOCKED' ? 'ACTIVE' : user.status,
  });

  // Determine next step
  const nextStep = user.mfa_enrolled ? 'VERIFY_MFA' : 'ENROLL_MFA';
  const partialType = user.mfa_enrolled ? 'MFA_REQUIRED' : 'ENROLL_MFA';

  const partial_token = jwt.sign(
    {
      sub: user.user_id,
      type: partialType,
      role: user.role_name,
      institutionId: user.institution_id,
    },
    config.jwtSecret,
    { expiresIn: 300 } // 5 minutes
  );

  return { partial_token, next_step: nextStep };
}

// ============================================================
// Verify MFA TOTP and issue full token
// ============================================================

export async function verifyMfaAndIssueToken(
  partial_token: string,
  totp_code: string
): Promise<string> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(partial_token, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    const err = new Error('Invalid or expired token') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (payload.type !== 'MFA_REQUIRED') {
    const err = new Error('Invalid token type') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.role_id')
    .where('users.user_id', payload.sub)
    .select('users.*', 'roles.role_name')
    .first();

  if (!user || !user.mfa_secret_encrypted) {
    const err = new Error('User not found or MFA not configured') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const secret = decryptTotpSecret(user.mfa_secret_encrypted);
  const isValid = authenticator.verify({ token: totp_code, secret });

  if (!isValid) {
    const err = new Error('Invalid MFA code') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'INVALID_MFA_CODE';
    throw err;
  }

  // Load permissions for the user's role
  const rolePermissions = await db('role_permissions')
    .where('role_id', user.role_id)
    .select('permission_key');

  const permissions = rolePermissions.map((rp: { permission_key: string }) => rp.permission_key);

  const userWithRole: UserWithRole = { ...user, role_name: user.role_name, permissions };
  return issuePortalToken(userWithRole);
}

// ============================================================
// Enroll MFA — step 1: generate secret + QR URI
// ============================================================

export async function enrollMfa(
  partial_token: string
): Promise<{ secret: string; qr_uri: string }> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(partial_token, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    const err = new Error('Invalid or expired token') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (payload.type !== 'ENROLL_MFA') {
    const err = new Error('Invalid token type') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const user = await db('users').where('user_id', payload.sub).first();
  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number; code: string };
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const secret = authenticator.generateSecret();
  const qr_uri = authenticator.keyuri(user.email, config.totpIssuer, secret);

  return { secret, qr_uri };
}

// ============================================================
// Confirm MFA enrollment
// ============================================================

export async function confirmMfaEnrollment(
  partial_token: string,
  totp_code: string,
  secret: string
): Promise<string> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(partial_token, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    const err = new Error('Invalid or expired token') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (payload.type !== 'ENROLL_MFA') {
    const err = new Error('Invalid token type') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const isValid = authenticator.verify({ token: totp_code, secret });
  if (!isValid) {
    const err = new Error('Invalid MFA code') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'INVALID_MFA_CODE';
    throw err;
  }

  const encryptedSecret = encryptTotpSecret(secret);
  await db('users').where('user_id', payload.sub).update({
    mfa_enrolled: true,
    mfa_secret_encrypted: encryptedSecret,
  });

  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.role_id')
    .where('users.user_id', payload.sub)
    .select('users.*', 'roles.role_name')
    .first();

  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number; code: string };
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const rolePermissions = await db('role_permissions')
    .where('role_id', user.role_id)
    .select('permission_key');

  const permissions = rolePermissions.map((rp: { permission_key: string }) => rp.permission_key);

  const userWithRole: UserWithRole = { ...user, role_name: user.role_name, permissions };
  return issuePortalToken(userWithRole);
}

// ============================================================
// Skip MFA enrollment — issue full token without enrolling
// ============================================================

export async function skipMfaEnrollment(partial_token: string): Promise<string> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(partial_token, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    const err = new Error('Invalid or expired token') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  if (payload.type !== 'ENROLL_MFA') {
    const err = new Error('Invalid token type') as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const user = await db('users')
    .join('roles', 'users.role_id', 'roles.role_id')
    .where('users.user_id', payload.sub)
    .select('users.*', 'roles.role_name')
    .first();

  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number; code: string };
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const rolePermissions = await db('role_permissions')
    .where('role_id', user.role_id)
    .select('permission_key');

  const permissions = rolePermissions.map((rp: { permission_key: string }) => rp.permission_key);
  const userWithRole: UserWithRole = { ...user, role_name: user.role_name, permissions };
  return issuePortalToken(userWithRole);
}
