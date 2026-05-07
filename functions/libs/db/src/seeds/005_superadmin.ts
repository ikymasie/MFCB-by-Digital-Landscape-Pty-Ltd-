import type { Knex } from 'knex';

// argon2id hash of '2010@R3ba0' — m=65536, t=3, p=4
const PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$LxeDtJp1lmN1KfPwJQD4QQ$63oTsjv3SsaC9OJ43aSVpAEsunQeBXuGrgdBBISctyU';

export async function seed(knex: Knex): Promise<void> {
  const role = await knex('roles').where('role_name', 'SUPER_ADMIN').first();
  if (!role) throw new Error('SUPER_ADMIN role not found — run 001_roles seed first');

  const passwordHash = PASSWORD_HASH;

  await knex('users')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000010',
      email: 'ikymasie@gmail.com',
      full_name: 'Ike Masie',
      password_hash: passwordHash,
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
      password_hash: passwordHash,
      role_id: role.role_id,
      status: 'ACTIVE',
      updated_at: new Date(),
    });

  console.log('Super admin seeded: ikymasie@gmail.com');
}
