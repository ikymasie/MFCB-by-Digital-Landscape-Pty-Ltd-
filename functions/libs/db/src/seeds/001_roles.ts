import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  const roles = [
    {
      role_name: 'SUPER_ADMIN',
      scope: 'PLATFORM',
      description: 'Bureau super administrator with full platform access',
    },
    {
      role_name: 'BUREAU_OPS',
      scope: 'PLATFORM',
      description: 'Bureau operations staff managing batches and institutions',
    },
    {
      role_name: 'COMPLIANCE',
      scope: 'PLATFORM',
      description: 'Compliance officer with read-only cross-institution access',
    },
    {
      role_name: 'INST_ADMIN',
      scope: 'INSTITUTION',
      description: 'Institution administrator managing own institution',
    },
    {
      role_name: 'INST_USER',
      scope: 'INSTITUTION',
      description: 'Institution user with submission and report access',
    },
    {
      role_name: 'AUDITOR',
      scope: 'PLATFORM',
      description: 'Auditor with read-only access to audit logs and reports',
    },
    {
      role_name: 'API_CLIENT',
      scope: 'INSTITUTION',
      description: 'Machine-to-machine API client (no portal access)',
    },
  ];

  await knex('roles').insert(roles).onConflict('role_name').ignore();
}
