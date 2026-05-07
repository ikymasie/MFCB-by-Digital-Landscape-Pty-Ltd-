import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('audit_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('actor_id').notNullable();
    table
      .string('actor_type', 20)
      .notNullable()
      .checkIn(['USER', 'API_CLIENT', 'SYSTEM']);
    table
      .uuid('institution_id')
      .nullable()
      .references('institution_id')
      .inTable('institutions');
    table.string('action', 80).notNullable();
    table.string('object_type', 50).nullable();
    table.uuid('object_id').nullable();
    table.string('correlation_id', 100).notNullable();
    table.specificType('ip_address', 'INET').notNullable();
    table.string('result', 10).notNullable().checkIn(['SUCCESS', 'FAILURE']);
    table.jsonb('detail').nullable();
    table
      .string('event_category', 20)
      .notNullable()
      .checkIn(['AUTH', 'DATA', 'ADMIN', 'REPORT', 'SECURITY', 'CONFIG']);
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id)');
  await knex.schema.raw(
    'CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC)',
  );
  await knex.schema.raw(
    'CREATE INDEX idx_audit_logs_institution ON audit_logs(institution_id)',
  );

  await knex.schema.createTable('webhook_configs', (table) => {
    table.uuid('webhook_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('institution_id')
      .notNullable()
      .references('institution_id')
      .inTable('institutions')
      .unique();
    table.string('url', 500).notNullable();
    table.string('secret_hash', 255).notNullable();
    table.specificType('events', 'TEXT[]').notNullable().defaultTo(knex.raw("ARRAY[]::TEXT[]"));
    table
      .string('status', 10)
      .notNullable()
      .defaultTo('ACTIVE')
      .checkIn(['ACTIVE', 'PAUSED', 'FAILED']);
    table.specificType('failure_count', 'SMALLINT').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sftp_config', (table) => {
    table.uuid('sftp_config_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('institution_id')
      .notNullable()
      .references('institution_id')
      .inTable('institutions')
      .unique();
    table.string('sftp_directory', 200).notNullable();
    table.jsonb('authorised_public_keys').notNullable().defaultTo('[]');
    table.string('pickup_schedule_cron', 50).notNullable().defaultTo('0 2 * * *');
    table
      .string('status', 10)
      .notNullable()
      .defaultTo('ACTIVE')
      .checkIn(['ACTIVE', 'INACTIVE']);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('certification_tests', (table) => {
    table.uuid('cert_test_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('institution_id')
      .notNullable()
      .references('institution_id')
      .inTable('institutions');
    table.string('scenario_code', 50).notNullable();
    table
      .string('status', 20)
      .notNullable()
      .defaultTo('NOT_STARTED')
      .checkIn(['NOT_STARTED', 'IN_PROGRESS', 'PASS', 'FAIL']);
    table
      .uuid('linked_batch_id')
      .nullable()
      .references('batch_id')
      .inTable('batch_uploads');
    table
      .uuid('linked_inquiry_id')
      .nullable()
      .references('inquiry_id')
      .inTable('credit_inquiries');
    table.text('notes').nullable();
    table.timestamp('completed_at', { useTz: true }).nullable();
    table.uuid('completed_by').nullable().references('user_id').inTable('users');
  });
  await knex.schema.raw(
    'CREATE INDEX idx_cert_tests_institution ON certification_tests(institution_id)',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('certification_tests');
  await knex.schema.dropTableIfExists('sftp_config');
  await knex.schema.dropTableIfExists('webhook_configs');
  await knex.schema.dropTableIfExists('audit_logs');
}
