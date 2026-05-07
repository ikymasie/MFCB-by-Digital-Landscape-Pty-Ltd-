import type { Knex } from 'knex';

type ScopeRestriction = 'OWN_INSTITUTION' | 'ALL' | null;

interface PermissionEntry {
  role_name: string;
  scope_restriction: ScopeRestriction;
}

interface PermissionDef {
  permission_key: string;
  entries: PermissionEntry[];
}

const OWN = 'OWN_INSTITUTION' as const;
const ALL = 'ALL' as const;

const permissionDefs: PermissionDef[] = [
  {
    permission_key: 'auth:login',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: ALL },
      { role_name: 'INST_USER', scope_restriction: ALL },
      { role_name: 'AUDITOR', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'institutions:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
      { role_name: 'AUDITOR', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'institutions:create',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'institutions:edit',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'institutions:suspend',
    entries: [{ role_name: 'SUPER_ADMIN', scope_restriction: ALL }],
  },
  {
    permission_key: 'users:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'users:create',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'users:edit',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'users:mfa_reset',
    entries: [{ role_name: 'SUPER_ADMIN', scope_restriction: ALL }],
  },
  {
    permission_key: 'batches:submit',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
      { role_name: 'INST_USER', scope_restriction: OWN },
      { role_name: 'API_CLIENT', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'batches:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
      { role_name: 'INST_USER', scope_restriction: OWN },
      { role_name: 'AUDITOR', scope_restriction: ALL },
      { role_name: 'API_CLIENT', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'batches:errors:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
      { role_name: 'INST_USER', scope_restriction: OWN },
      { role_name: 'AUDITOR', scope_restriction: ALL },
      { role_name: 'API_CLIENT', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'batches:accepted:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
      { role_name: 'INST_USER', scope_restriction: OWN },
      { role_name: 'API_CLIENT', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'batches:force_retry',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'batches:quarantine',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'reports:request',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
      { role_name: 'INST_USER', scope_restriction: OWN },
      { role_name: 'API_CLIENT', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'reports:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
      { role_name: 'INST_USER', scope_restriction: OWN },
      { role_name: 'API_CLIENT', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'reports:pdf',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
      { role_name: 'INST_USER', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'inquiries:read_own',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
      { role_name: 'INST_USER', scope_restriction: OWN },
      { role_name: 'AUDITOR', scope_restriction: ALL },
      { role_name: 'API_CLIENT', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'inquiries:read_all',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'AUDITOR', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'reference:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: ALL },
      { role_name: 'INST_USER', scope_restriction: ALL },
      { role_name: 'AUDITOR', scope_restriction: ALL },
      { role_name: 'API_CLIENT', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'reference:edit',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'reference:approve',
    entries: [{ role_name: 'SUPER_ADMIN', scope_restriction: ALL }],
  },
  {
    permission_key: 'audit:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'AUDITOR', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'audit:export',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'AUDITOR', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'security_events:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'AUDITOR', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'corrections:request',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'corrections:approve',
    entries: [{ role_name: 'SUPER_ADMIN', scope_restriction: ALL }],
  },
  {
    permission_key: 'regulatory_reports:export',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'AUDITOR', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'sandbox:manage',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'webhooks:configure',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'webhooks:test',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'sftp:configure',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'api_clients:create',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'api_clients:regenerate',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'api_clients:revoke',
    entries: [{ role_name: 'SUPER_ADMIN', scope_restriction: ALL }],
  },
  {
    permission_key: 'ops:queue:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'ops:queue:manage',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'data_quality:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'INST_ADMIN', scope_restriction: OWN },
    ],
  },
  {
    permission_key: 'compliance_dashboard:read',
    entries: [
      { role_name: 'SUPER_ADMIN', scope_restriction: ALL },
      { role_name: 'BUREAU_OPS', scope_restriction: ALL },
      { role_name: 'COMPLIANCE', scope_restriction: ALL },
      { role_name: 'AUDITOR', scope_restriction: ALL },
    ],
  },
  {
    permission_key: 'status_matrix:edit',
    entries: [{ role_name: 'SUPER_ADMIN', scope_restriction: ALL }],
  },
];

export async function seed(knex: Knex): Promise<void> {
  // Load role name → id mapping
  const rolesRows = await knex('roles').select('role_id', 'role_name');
  const roleMap = new Map<string, string>(
    rolesRows.map((r: { role_id: string; role_name: string }) => [r.role_name, r.role_id]),
  );

  const rows: { role_id: string; permission_key: string; scope_restriction: ScopeRestriction }[] =
    [];

  for (const def of permissionDefs) {
    for (const entry of def.entries) {
      const role_id = roleMap.get(entry.role_name);
      if (!role_id) {
        throw new Error(`Role not found: ${entry.role_name}`);
      }
      rows.push({
        role_id,
        permission_key: def.permission_key,
        scope_restriction: entry.scope_restriction,
      });
    }
  }

  await knex('role_permissions')
    .insert(rows)
    .onConflict(['role_id', 'permission_key'])
    .ignore();
}
