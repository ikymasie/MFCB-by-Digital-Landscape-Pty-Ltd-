import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('batch_uploads', (table) => {
    table.uuid('batch_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('institution_id')
      .notNullable()
      .references('institution_id')
      .inTable('institutions');
    table.string('supplier_reference_number', 10).notNullable();
    table.specificType('reporting_month', 'CHAR(8)').notNullable();
    table.string('file_type', 10).notNullable().checkIn(['TEST', 'LIVE']);
    table.specificType('sequence_number', 'SMALLINT').notNullable().defaultTo(1);
    table.uuid('idempotency_key').notNullable().unique();
    table.string('source_file_name', 120).nullable();
    table.specificType('file_hash_sha256', 'CHAR(64)').nullable();
    table.bigInteger('file_size_bytes').nullable();
    table
      .string('channel', 20)
      .notNullable()
      .checkIn(['REST_API', 'PORTAL_UPLOAD', 'SFTP']);
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('QUEUED')
      .checkIn(['QUEUED', 'VALIDATING', 'COMPLETED', 'FAILED', 'QUARANTINED']);
    table.string('stage', 50).notNullable().defaultTo('QUEUED');
    table.integer('total_records').nullable();
    table.integer('accepted_count').nullable();
    table.integer('rejected_count').nullable();
    table.integer('warning_count').nullable();
    table.string('header_supplier_ref', 10).nullable();
    table.specificType('header_month_end', 'CHAR(8)').nullable();
    table.specificType('header_version', 'CHAR(2)').nullable();
    table.specificType('header_file_creation_date', 'CHAR(8)').nullable();
    table.integer('trailer_record_count').nullable();
    table.timestamp('queued_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('started_at', { useTz: true }).nullable();
    table.timestamp('completed_at', { useTz: true }).nullable();
    table.uuid('submitted_by_user_id').nullable().references('user_id').inTable('users');
    table.uuid('submitted_by_client_id').nullable().references('client_id').inTable('api_clients');
    table.string('correlation_id', 100).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw(
    'CREATE INDEX idx_batch_uploads_institution ON batch_uploads(institution_id)',
  );
  await knex.schema.raw('CREATE INDEX idx_batch_uploads_status ON batch_uploads(status)');
  await knex.schema.raw(
    'CREATE INDEX idx_batch_uploads_reporting_month ON batch_uploads(reporting_month)',
  );

  await knex.schema.createTable('raw_submission_records', (table) => {
    table.uuid('raw_record_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('batch_id')
      .notNullable()
      .references('batch_id')
      .inTable('batch_uploads')
      .onDelete('CASCADE');
    table.integer('row_number').notNullable();
    table.specificType('record_type', "CHAR(1)").notNullable().defaultTo('D');
    table.jsonb('raw_payload').notNullable();
    table.boolean('is_correction').notNullable().defaultTo(false);
    table.uuid('corrects_raw_record_id').nullable();
    table.text('correction_reason').nullable();
    table.uuid('correction_approved_by').nullable().references('user_id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw(
    'CREATE INDEX idx_raw_records_batch ON raw_submission_records(batch_id)',
  );

  await knex.schema.createTable('validation_errors', (table) => {
    table.uuid('error_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('batch_id')
      .notNullable()
      .references('batch_id')
      .inTable('batch_uploads')
      .onDelete('CASCADE');
    table
      .uuid('raw_record_id')
      .nullable()
      .references('raw_record_id')
      .inTable('raw_submission_records');
    table.integer('row_number').nullable();
    table.string('field', 80).nullable();
    table.string('code', 80).notNullable();
    table.string('severity', 10).notNullable().checkIn(['REJECT', 'WARN']);
    table.text('raw_value').nullable();
    table.text('message').notNullable();
    table
      .string('error_category', 20)
      .notNullable()
      .checkIn([
        'IDENTITY',
        'DATE',
        'FINANCIAL',
        'STATUS',
        'REFERENCE',
        'DUPLICATE',
        'CROSS_FIELD',
        'FILE_LEVEL',
      ]);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw(
    'CREATE INDEX idx_validation_errors_batch ON validation_errors(batch_id)',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('validation_errors');
  await knex.schema.dropTableIfExists('raw_submission_records');
  await knex.schema.dropTableIfExists('batch_uploads');
}
