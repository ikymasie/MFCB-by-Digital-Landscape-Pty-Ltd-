import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('role_id').notNullable().references('role_id').inTable('roles').onDelete('CASCADE');
    table.string('permission_key', 80).notNullable();
    table
      .string('scope_restriction', 20)
      .nullable()
      .checkIn(['OWN_INSTITUTION', 'ALL']);
    table.primary(['role_id', 'permission_key']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('role_permissions');
}
