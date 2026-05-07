import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('borrowers', (table) => {
    table.uuid('borrower_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.specificType('omang_id_number', 'CHAR(9)').nullable();
    table.string('passport_number', 16).nullable();
    table.string('surname', 25).notNullable();
    table.string('forename_1', 14).notNullable();
    table.string('forename_2', 14).nullable();
    table.string('forename_3', 14).nullable();
    table.string('title', 5).nullable();
    table.specificType('gender', 'CHAR(1)').notNullable();
    table.specificType('date_of_birth', 'CHAR(8)').notNullable();
    table.string('nationality', 25).nullable();
    table.string('marital_status', 10).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw(
    "ALTER TABLE borrowers ADD CONSTRAINT borrowers_identity_check CHECK (omang_id_number IS NOT NULL OR passport_number IS NOT NULL)",
  );
  await knex.schema.raw(
    'CREATE UNIQUE INDEX idx_borrowers_omang ON borrowers(omang_id_number) WHERE omang_id_number IS NOT NULL',
  );

  await knex.schema.createTable('borrower_identifiers', (table) => {
    table.uuid('identifier_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('borrower_id').notNullable().references('borrower_id').inTable('borrowers');
    table.string('id_type', 20).notNullable().checkIn(['OMANG', 'PASSPORT', 'OTHER_ID']);
    table.string('id_value', 16).notNullable();
    table.timestamp('effective_from', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('effective_to', { useTz: true }).nullable();
    table
      .uuid('source_institution_id')
      .notNullable()
      .references('institution_id')
      .inTable('institutions');
    table
      .uuid('source_batch_id')
      .notNullable()
      .references('batch_id')
      .inTable('batch_uploads');
  });

  await knex.schema.createTable('borrower_addresses', (table) => {
    table.uuid('address_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('borrower_id').notNullable().references('borrower_id').inTable('borrowers');
    table
      .string('address_type', 15)
      .notNullable()
      .checkIn(['RESIDENTIAL', 'POSTAL']);
    table.string('line_1', 25).notNullable();
    table.string('line_2', 25).notNullable();
    table.string('line_3', 25).nullable();
    table.string('line_4', 25).nullable();
    table.string('postal_code', 6).nullable();
    table.specificType('owner_tenant', 'CHAR(1)').nullable();
    table.timestamp('effective_from', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('effective_to', { useTz: true }).nullable();
    table
      .uuid('source_batch_id')
      .notNullable()
      .references('batch_id')
      .inTable('batch_uploads');
  });

  await knex.schema.createTable('borrower_employment', (table) => {
    table.uuid('employment_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('borrower_id').notNullable().references('borrower_id').inTable('borrowers');
    table.string('employer_name', 60).nullable();
    table.string('occupation', 20).nullable();
    table.integer('income').nullable();
    table.specificType('income_frequency', 'CHAR(1)').nullable();
    table
      .uuid('source_batch_id')
      .notNullable()
      .references('batch_id')
      .inTable('batch_uploads');
    table.specificType('reporting_month', 'CHAR(8)').notNullable();
  });
  await knex.schema.raw(
    'CREATE INDEX idx_borrower_employment_borrower ON borrower_employment(borrower_id)',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('borrower_employment');
  await knex.schema.dropTableIfExists('borrower_addresses');
  await knex.schema.dropTableIfExists('borrower_identifiers');
  await knex.schema.dropTableIfExists('borrowers');
}
