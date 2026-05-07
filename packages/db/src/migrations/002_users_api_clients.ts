import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('user_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('full_name', 120).notNullable();
    table.string('password_hash', 255).notNullable();
    table.uuid('role_id').notNullable().references('role_id').inTable('roles');
    table.uuid('institution_id').nullable().references('institution_id').inTable('institutions');
    table.boolean('mfa_enrolled').notNullable().defaultTo(false);
    table.text('mfa_secret_encrypted').nullable();
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('ACTIVE')
      .checkIn(['ACTIVE', 'LOCKED', 'INACTIVE']);
    table.specificType('failed_login_count', 'SMALLINT').notNullable().defaultTo(0);
    table.timestamp('locked_until', { useTz: true }).nullable();
    table.timestamp('last_login_at', { useTz: true }).nullable();
    table.uuid('invited_by').nullable().references('user_id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Add the deferred FK from institutions back to users
  await knex.schema.alterTable('institutions', (table) => {
    table
      .foreign('onboarded_by', 'fk_institutions_onboarded_by')
      .references('user_id')
      .inTable('users');
  });

  await knex.schema.createTable('api_clients', (table) => {
    table.uuid('client_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('institution_id')
      .notNullable()
      .references('institution_id')
      .inTable('institutions');
    table.string('client_secret_hash', 255).notNullable();
    table.specificType('scopes', 'TEXT[]').notNullable().defaultTo(knex.raw("ARRAY[]::TEXT[]"));
    table.jsonb('allowed_ip_ranges').nullable();
    table.integer('token_ttl_seconds').notNullable().defaultTo(3600);
    table.timestamp('expires_at', { useTz: true }).nullable();
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('ACTIVE')
      .checkIn(['ACTIVE', 'REVOKED']);
    table.timestamp('last_used_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('user_id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('institutions', (table) => {
    table.dropForeign('onboarded_by', 'fk_institutions_onboarded_by');
  });
  await knex.schema.dropTableIfExists('api_clients');
  await knex.schema.dropTableIfExists('users');
}
