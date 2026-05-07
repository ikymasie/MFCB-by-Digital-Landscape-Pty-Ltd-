import type { Knex } from 'knex';

/**
 * Inserts the system seed user and a SUPER_ADMIN role placeholder so that
 * reference_codes.created_by and status_account_type_rules.updated_by FK
 * constraints are satisfied during seeding.
 */
export async function seed(knex: Knex): Promise<void> {
  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
  const SYSTEM_ROLE_ID = '00000000-0000-0000-0000-000000000002';

  // Ensure the SUPER_ADMIN role exists with the known system UUID
  await knex.raw(
    `INSERT INTO roles (role_id, role_name, scope, description)
     VALUES (?, 'SUPER_ADMIN', 'PLATFORM', 'Bureau super administrator with full platform access')
     ON CONFLICT (role_name) DO NOTHING`,
    [SYSTEM_ROLE_ID],
  );

  // Re-read the actual role_id for SUPER_ADMIN (may have been inserted by seed 001 with a different id)
  const roleRow = await knex('roles').where({ role_name: 'SUPER_ADMIN' }).first('role_id');
  const actualRoleId: string = roleRow?.role_id ?? SYSTEM_ROLE_ID;

  // Insert the system seed user
  await knex.raw(
    `INSERT INTO users (user_id, email, full_name, password_hash, role_id, mfa_enrolled, status, failed_login_count)
     VALUES (?, 'system@seed.internal', 'System Seed User', 'NOT_A_REAL_HASH', ?, false, 'INACTIVE', 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [SYSTEM_USER_ID, actualRoleId],
  );
}
