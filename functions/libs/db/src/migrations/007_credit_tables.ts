import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('credit_accounts', (table) => {
    table.uuid('credit_account_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('institution_id')
      .notNullable()
      .references('institution_id')
      .inTable('institutions');
    table.uuid('borrower_id').notNullable().references('borrower_id').inTable('borrowers');
    table.string('branch_code', 8).nullable();
    table.string('account_number', 25).notNullable();
    table.specificType('sub_account_number', 'VARCHAR(4)').notNullable();
    table.specificType('account_ownership_type', 'CHAR(2)').notNullable();
    table.specificType('loan_reason_code', 'CHAR(2)').notNullable();
    table.specificType('payment_type', 'CHAR(2)').notNullable();
    table.specificType('account_type', 'CHAR(2)').notNullable();
    table.specificType('date_account_opened', 'CHAR(8)').notNullable();
    table.specificType('deferred_payment_start_date', 'CHAR(8)').nullable();
    table.specificType('last_payment_date', 'CHAR(8)').nullable();
    table.integer('opening_balance_or_credit_limit').notNullable().defaultTo(0);
    table.integer('current_balance').nullable();
    table.specificType('current_balance_indicator', 'CHAR(1)').notNullable().defaultTo('D');
    table.integer('instalment_amount').nullable();
    table.specificType('months_in_arrears', 'CHAR(2)').notNullable().defaultTo('00');
    table.integer('amount_overdue').nullable();
    table.specificType('status_code', 'CHAR(2)').nullable();
    table.specificType('status_date', 'CHAR(8)').nullable();
    table.specificType('repayment_frequency', 'CHAR(2)').notNullable();
    table.specificType('loan_term', 'CHAR(4)').nullable();
    table.specificType('no_of_participants', 'SMALLINT').nullable();
    table.string('third_party_name', 60).nullable();
    table.specificType('account_sold_to_third_party', 'CHAR(2)').nullable();
    table.string('old_supplier_branch_code', 8).nullable();
    table.string('old_account_number', 25).nullable();
    table.specificType('old_sub_account_number', 'CHAR(4)').nullable();
    table.string('old_supplier_reference_no', 10).nullable();
    table.string('cellular_telephone', 10).nullable();
    table.string('telephone_h', 10).nullable();
    table.string('telephone_w', 10).nullable();
    table.string('email_address', 100).nullable();
    table.specificType('first_reporting_month', 'CHAR(8)').notNullable();
    table.specificType('last_reporting_month', 'CHAR(8)').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['institution_id', 'account_number', 'sub_account_number']);
  });
  await knex.schema.raw(
    'CREATE INDEX idx_credit_accounts_borrower ON credit_accounts(borrower_id)',
  );
  await knex.schema.raw(
    'CREATE INDEX idx_credit_accounts_institution ON credit_accounts(institution_id)',
  );

  await knex.schema.createTable('repayment_history', (table) => {
    table.uuid('history_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('credit_account_id')
      .notNullable()
      .references('credit_account_id')
      .inTable('credit_accounts');
    table.specificType('reporting_month', 'CHAR(8)').notNullable();
    table.specificType('months_in_arrears', 'CHAR(2)').notNullable();
    table.integer('current_balance').notNullable().defaultTo(0);
    table.integer('instalment_amount').notNullable().defaultTo(0);
    table.integer('amount_overdue').notNullable().defaultTo(0);
    table.specificType('payment_type', 'CHAR(2)').notNullable();
    table.specificType('status_code', 'CHAR(2)').nullable();
    table.uuid('batch_id').notNullable().references('batch_id').inTable('batch_uploads');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['credit_account_id', 'reporting_month']);
  });

  await knex.schema.createTable('account_status_events', (table) => {
    table.uuid('event_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('credit_account_id')
      .notNullable()
      .references('credit_account_id')
      .inTable('credit_accounts');
    table.specificType('status_code', 'CHAR(2)').notNullable();
    table.specificType('status_date', 'CHAR(8)').notNullable();
    table.specificType('submitted_month', 'CHAR(8)').notNullable();
    table.uuid('batch_id').notNullable().references('batch_id').inTable('batch_uploads');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw(
    'CREATE INDEX idx_status_events_account ON account_status_events(credit_account_id)',
  );

  await knex.schema.createTable('credit_inquiries', (table) => {
    table.uuid('inquiry_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('institution_id')
      .notNullable()
      .references('institution_id')
      .inTable('institutions');
    table.uuid('requested_by_user_id').nullable().references('user_id').inTable('users');
    table
      .uuid('requested_by_client_id')
      .nullable()
      .references('client_id')
      .inTable('api_clients');
    table
      .string('search_type', 20)
      .notNullable()
      .checkIn(['OMANG', 'PASSPORT', 'ACCOUNT_NUMBER', 'CELLULAR', 'SURNAME_DOB']);
    table.string('search_value_masked', 50).notNullable();
    table.string('inquiry_reason', 50).notNullable();
    table.string('customer_consent_reference', 100).nullable();
    table
      .string('result', 30)
      .notNullable()
      .checkIn(['MATCH', 'NO_MATCH', 'MATCH_REVIEW_REQUIRED']);
    table.uuid('borrower_id').nullable().references('borrower_id').inTable('borrowers');
    table.uuid('report_id').nullable();
    table.string('correlation_id', 100).notNullable();
    table.specificType('ip_address', 'INET').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw(
    'CREATE INDEX idx_inquiries_institution ON credit_inquiries(institution_id)',
  );
  await knex.schema.raw(
    'CREATE INDEX idx_inquiries_borrower ON credit_inquiries(borrower_id)',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('credit_inquiries');
  await knex.schema.dropTableIfExists('account_status_events');
  await knex.schema.dropTableIfExists('repayment_history');
  await knex.schema.dropTableIfExists('credit_accounts');
}
