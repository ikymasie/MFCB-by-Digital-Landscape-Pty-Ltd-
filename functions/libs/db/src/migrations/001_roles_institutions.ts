import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.uuid('role_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('role_name', 50).notNullable().unique();
    table.string('scope', 20).notNullable().checkIn(['PLATFORM', 'INSTITUTION']);
    table.text('description').nullable();
  });

  await knex.schema.createTable('institutions', (table) => {
    table.uuid('institution_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 120).notNullable();
    table.string('supplier_reference_number', 10).notNullable().unique();
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('PENDING')
      .checkIn(['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']);
    table
      .string('integration_channel', 20)
      .notNullable()
      .checkIn(['REST_API', 'PORTAL_UPLOAD', 'SFTP']);
    table.specificType('enabled_products', 'TEXT[]').notNullable().defaultTo(knex.raw("ARRAY[]::TEXT[]"));
    table.jsonb('allowed_ip_ranges').nullable();
    table.string('mtls_cert_fingerprint', 128).nullable();
    table.timestamp('onboarded_at', { useTz: true }).nullable();
    table.uuid('onboarded_by').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('institutions');
  await knex.schema.dropTableIfExists('roles');
}
