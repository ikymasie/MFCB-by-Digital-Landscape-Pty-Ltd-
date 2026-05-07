import { randomUUID, randomBytes } from 'crypto';
import argon2 from 'argon2';
import { db } from '../db/client';
import { config } from '../config';

interface SafeUser {
  user_id: string;
  email: string;
  full_name: string;
  role_id: string;
  institution_id: string | null;
  mfa_enrolled: boolean;
  status: string;
  failed_login_count: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  invited_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function listUsers(filters: {
  institutionId?: string | null;
}): Promise<SafeUser[]> {
  let query = db('users')
    .select(
      'user_id',
      'email',
      'full_name',
      'role_id',
      'institution_id',
      'mfa_enrolled',
      'status',
      'failed_login_count',
      'locked_until',
      'last_login_at',
      'invited_by',
      'created_at',
      'updated_at'
    );

  if (filters.institutionId) {
    query = query.where('institution_id', filters.institutionId);
  }

  return query.orderBy('created_at', 'desc');
}

export async function getUserById(userId: string): Promise<SafeUser | null> {
  const user = await db('users')
    .where('user_id', userId)
    .select(
      'user_id',
      'email',
      'full_name',
      'role_id',
      'institution_id',
      'mfa_enrolled',
      'status',
      'failed_login_count',
      'locked_until',
      'last_login_at',
      'invited_by',
      'created_at',
      'updated_at'
    )
    .first();

  return user ?? null;
}

export async function inviteUser(input: {
  email: string;
  full_name: string;
  role_id: string;
  institution_id?: string | null;
  invited_by: string;
}): Promise<{ user_id: string; email: string }> {
  // Generate temporary password
  const tempPassword = randomBytes(8).toString('hex'); // 16 hex chars

  const passwordHash = await argon2.hash(tempPassword, {
    type: argon2.argon2id,
    memoryCost: config.argon2.memoryCost,
    timeCost: config.argon2.timeCost,
    parallelism: config.argon2.parallelism,
  });

  const userId = randomUUID();
  const now = new Date();

  await db('users').insert({
    user_id: userId,
    email: input.email.toLowerCase(),
    full_name: input.full_name,
    password_hash: passwordHash,
    role_id: input.role_id,
    institution_id: input.institution_id ?? null,
    mfa_enrolled: false,
    mfa_secret_encrypted: null,
    status: 'ACTIVE',
    failed_login_count: 0,
    locked_until: null,
    last_login_at: null,
    invited_by: input.invited_by,
    created_at: now,
    updated_at: now,
  });

  // In production, send this via email
  console.log(`[INVITE] User ${input.email} created with temp password: ${tempPassword}`);

  return { user_id: userId, email: input.email };
}

export async function updateUser(
  userId: string,
  input: {
    full_name?: string;
    role_id?: string;
    status?: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  }
): Promise<SafeUser | null> {
  const updateData: Record<string, unknown> = { updated_at: new Date() };

  if (input.full_name !== undefined) updateData.full_name = input.full_name;
  if (input.role_id !== undefined) updateData.role_id = input.role_id;
  if (input.status !== undefined) updateData.status = input.status;

  const [updated] = await db('users')
    .where('user_id', userId)
    .update(updateData)
    .returning([
      'user_id',
      'email',
      'full_name',
      'role_id',
      'institution_id',
      'mfa_enrolled',
      'status',
      'failed_login_count',
      'locked_until',
      'last_login_at',
      'invited_by',
      'created_at',
      'updated_at',
    ]);

  return updated ?? null;
}

export async function resetUserMfa(userId: string): Promise<void> {
  await db('users').where('user_id', userId).update({
    mfa_enrolled: false,
    mfa_secret_encrypted: null,
    updated_at: new Date(),
  });
}
