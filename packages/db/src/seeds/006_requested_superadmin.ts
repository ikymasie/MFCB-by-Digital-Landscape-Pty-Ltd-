import type { Knex } from 'knex';

const PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$gZZFb+tlRxIrDdTzq15tDw$aauaTd4d+RzQVekuKD4ZsOah6YhN9AlyO8KLljUadrI';

export async function seed(knex: Knex): Promise<void> {
  const role = await knex('roles').where('role_name', 'SUPER_ADMIN').first();
  if (!role) throw new Error('SUPER_ADMIN role not found');

  await knex('users')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000020', // Unique ID
      email: 'admin@mfcb.co.bw',
      full_name: 'System Admin',
      password_hash: PASSWORD_HASH,
      role_id: role.role_id,
      institution_id: null,
      mfa_enrolled: false,
      status: 'ACTIVE',
      failed_login_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .onConflict('email')
    .merge({
      password_hash: PASSWORD_HASH,
      role_id: role.role_id,
      status: 'ACTIVE',
      updated_at: new Date(),
    });

  console.log('Super admin created/updated: admin@mfcb.co.bw');
}
