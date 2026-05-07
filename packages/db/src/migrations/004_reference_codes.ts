import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reference_codes', (table) => {
    table.string('code_type', 50).notNullable();
    table.string('code', 10).notNullable();
    table.string('description', 120).notNullable();
    table.text('definition').nullable();
    table.date('effective_date').notNullable();
    table.date('deprecated_at').nullable();
    table.specificType('display_order', 'SMALLINT').nullable();
    table.uuid('created_by').notNullable().references('user_id').inTable('users');
    table.uuid('approved_by').nullable().references('user_id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(['code_type', 'code']);
  });

  await knex.schema.createTable('status_account_type_rules', (table) => {
    table.specificType('account_type', 'CHAR(2)').notNullable();
    table.specificType('status_code', 'CHAR(2)').notNullable();
    table.boolean('is_allowed_monthly').notNullable().defaultTo(false);
    table.boolean('is_allowed_daily').notNullable().defaultTo(false);
    table.uuid('updated_by').notNullable().references('user_id').inTable('users');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(['account_type', 'status_code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('status_account_type_rules');
  await knex.schema.dropTableIfExists('reference_codes');
}
