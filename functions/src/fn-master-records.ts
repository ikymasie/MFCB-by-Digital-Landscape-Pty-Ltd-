import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import type { Knex } from 'knex';
import { config } from './config';
import { getDb } from './db';
import { getDb as getFirestoreDb } from './firestore';
import { publishMessage } from './pubsub';
import type { MasterRecordsMessage, BatchCompleteMessage } from './types';

export const fnMasterRecords = onMessagePublished(
  {
    topic: config.pubsub.masterRecordsTopic,
    memory: '1GiB',
    timeoutSeconds: 540,
    maxInstances: 20,
    retry: true,
  },
  async (event) => {
    const message: MasterRecordsMessage = JSON.parse(
      Buffer.from(event.data.message.data, 'base64').toString(),
    );

    const {
      batch_id,
      institution_id,
      reporting_month,
      accepted_raw_record_ids,
      chunk_index,
      total_mastering_chunks,
    } = message;

    const db = getDb();
    const firestore = getFirestoreDb();

    // Load raw records
    const rawRecords = await db('raw_submission_records')
      .whereIn('raw_record_id', accepted_raw_record_ids)
      .select('*');

    for (const raw of rawRecords) {
      const payload = raw.raw_payload as Record<string, unknown>;

      await db.transaction(async (trx: Knex.Transaction) => {
        // 1. Resolve or create borrower
        let borrowerId: string | null = null;
        const omang = (payload.omang_id_number as string)?.trim();
        const passport = (payload.passport_number as string)?.trim();

        if (omang) {
          const existing = await trx('borrowers').where('omang_id_number', omang).first();
          if (existing) {
            borrowerId = existing.borrower_id;
            // Update borrower with latest data
            await trx('borrowers').where('borrower_id', borrowerId).update({
              surname: payload.surname,
              forename_1: payload.forename_1,
              forename_2: payload.forename_2 || null,
              forename_3: payload.forename_3 || null,
              title: payload.title || null,
              gender: payload.gender,
              date_of_birth: payload.date_of_birth,
              updated_at: new Date(),
            });
          } else {
            const [inserted] = await trx('borrowers')
              .insert({
                borrower_id: crypto.randomUUID(),
                omang_id_number: omang || null,
                passport_number: passport || null,
                surname: payload.surname,
                forename_1: payload.forename_1,
                forename_2: payload.forename_2 || null,
                forename_3: payload.forename_3 || null,
                title: payload.title || null,
                gender: payload.gender,
                date_of_birth: payload.date_of_birth,
                nationality: payload.nationality || null,
                marital_status: payload.marital_status || null,
                created_at: new Date(),
                updated_at: new Date(),
              })
              .returning('borrower_id');
            borrowerId = inserted.borrower_id;
          }
        } else if (passport) {
          // Similar lookup/upsert by passport
          const existing = await trx('borrowers').where('passport_number', passport).first();
          if (existing) {
            borrowerId = existing.borrower_id;
          } else {
            const [inserted] = await trx('borrowers')
              .insert({
                borrower_id: crypto.randomUUID(),
                omang_id_number: null,
                passport_number: passport,
                surname: payload.surname,
                forename_1: payload.forename_1,
                forename_2: payload.forename_2 || null,
                forename_3: payload.forename_3 || null,
                gender: payload.gender,
                date_of_birth: payload.date_of_birth,
                created_at: new Date(),
                updated_at: new Date(),
              })
              .returning('borrower_id');
            borrowerId = inserted.borrower_id;
          }
        }

        if (!borrowerId) return; // should not happen for accepted records

        // 2. Upsert borrower_identifiers
        if (omang) {
          await trx('borrower_identifiers')
            .insert({
              identifier_id: crypto.randomUUID(),
              borrower_id: borrowerId,
              id_type: 'OMANG',
              id_value: omang,
              effective_from: new Date(),
              source_institution_id: institution_id,
              source_batch_id: batch_id,
            })
            .onConflict(trx.raw('(borrower_id, id_type, id_value)') as unknown as string[])
            .ignore();
        }

        // 3. Upsert borrower_addresses
        const resLine1 = (payload.residential_address_line_1 as string)?.trim();
        if (resLine1) {
          // Close existing active residential address for this borrower if different
          await trx('borrower_addresses')
            .where({ borrower_id: borrowerId, address_type: 'RESIDENTIAL', effective_to: null })
            .update({ effective_to: new Date() });

          await trx('borrower_addresses').insert({
            address_id: crypto.randomUUID(),
            borrower_id: borrowerId,
            address_type: 'RESIDENTIAL',
            line_1: resLine1,
            line_2: (payload.residential_address_line_2 as string)?.trim() ?? '',
            line_3: (payload.residential_address_line_3 as string)?.trim() || null,
            line_4: (payload.residential_address_line_4 as string)?.trim() || null,
            postal_code: (payload.residential_postal_code as string)?.trim() || null,
            owner_tenant: (payload.owner_tenant as string)?.trim() || null,
            effective_from: new Date(),
            source_batch_id: batch_id,
          });
        }

        // 4. Upsert borrower_employment
        // NOTE: income is stored but NEVER returned via API — the API layer enforces this
        const employerName = (payload.employer_name as string)?.trim();
        if (employerName) {
          await trx('borrower_employment').insert({
            employment_id: crypto.randomUUID(),
            borrower_id: borrowerId,
            employer_name: employerName,
            occupation: (payload.occupation as string)?.trim() || null,
            income: payload.income ? parseInt(payload.income as string, 10) : null, // stored, never returned
            income_frequency: (payload.income_frequency as string)?.trim() || null,
            source_batch_id: batch_id,
            reporting_month,
          });
        }

        // 5. Upsert credit_account
        const accountNumber = (payload.account_number as string)?.trim();
        const subAccountNumber = (payload.sub_account_number as string)?.trim();

        const existingAccount = await trx('credit_accounts')
          .where({
            institution_id,
            account_number: accountNumber,
            sub_account_number: subAccountNumber,
          })
          .first();

        let creditAccountId: string;

        if (existingAccount) {
          creditAccountId = existingAccount.credit_account_id;
          await trx('credit_accounts').where('credit_account_id', creditAccountId).update({
            borrower_id: borrowerId,
            branch_code: (payload.branch_code as string)?.trim() || null,
            payment_type: payload.payment_type,
            account_type: payload.account_type,
            last_payment_date: (payload.last_payment_date as string)?.trim() || null,
            opening_balance_or_credit_limit:
              parseInt(payload.opening_balance_or_credit_limit as string, 10) || 0,
            current_balance: parseInt(payload.current_balance as string, 10) || 0,
            current_balance_indicator: payload.current_balance_indicator,
            instalment_amount: parseInt(payload.instalment_amount as string, 10) || 0,
            months_in_arrears: payload.months_in_arrears,
            amount_overdue: parseInt(payload.amount_overdue as string, 10) || 0,
            status_code: (payload.status_code as string)?.trim() || null,
            status_date: (payload.status_date as string)?.trim() || null,
            cellular_telephone: (payload.cellular_telephone as string)?.trim() || null,
            telephone_h: (payload.telephone_h as string)?.trim() || null,
            telephone_w: (payload.telephone_w as string)?.trim() || null,
            email_address: (payload.email_address as string)?.trim() || null,
            last_reporting_month: reporting_month,
            updated_at: new Date(),
          });
        } else {
          creditAccountId = crypto.randomUUID();
          await trx('credit_accounts').insert({
            credit_account_id: creditAccountId,
            institution_id,
            borrower_id: borrowerId,
            branch_code: (payload.branch_code as string)?.trim() || null,
            account_number: accountNumber,
            sub_account_number: subAccountNumber,
            account_ownership_type: payload.account_ownership_type,
            loan_reason_code: payload.loan_reason_code,
            payment_type: payload.payment_type,
            account_type: payload.account_type,
            date_account_opened: payload.date_account_opened,
            deferred_payment_start_date:
              (payload.deferred_payment_start_date as string)?.trim() || null,
            last_payment_date: (payload.last_payment_date as string)?.trim() || null,
            opening_balance_or_credit_limit:
              parseInt(payload.opening_balance_or_credit_limit as string, 10) || 0,
            current_balance: parseInt(payload.current_balance as string, 10) || 0,
            current_balance_indicator: payload.current_balance_indicator,
            instalment_amount: parseInt(payload.instalment_amount as string, 10) || 0,
            months_in_arrears: payload.months_in_arrears,
            amount_overdue: parseInt(payload.amount_overdue as string, 10) || 0,
            status_code: (payload.status_code as string)?.trim() || null,
            status_date: (payload.status_date as string)?.trim() || null,
            repayment_frequency: payload.repayment_frequency,
            loan_term: (payload.loan_term as string)?.trim() || null,
            no_of_participants: payload.no_of_participants
              ? parseInt(payload.no_of_participants as string, 10)
              : null,
            third_party_name: (payload.third_party_name as string)?.trim() || null,
            account_sold_to_third_party:
              (payload.account_sold_to_third_party as string)?.trim() || null,
            old_supplier_branch_code:
              (payload.old_supplier_branch_code as string)?.trim() || null,
            old_account_number: (payload.old_account_number as string)?.trim() || null,
            old_sub_account_number: (payload.old_sub_account_number as string)?.trim() || null,
            old_supplier_reference_no:
              (payload.old_supplier_reference_no as string)?.trim() || null,
            cellular_telephone: (payload.cellular_telephone as string)?.trim() || null,
            telephone_h: (payload.telephone_h as string)?.trim() || null,
            telephone_w: (payload.telephone_w as string)?.trim() || null,
            email_address: (payload.email_address as string)?.trim() || null,
            first_reporting_month: reporting_month,
            last_reporting_month: reporting_month,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }

        // 6. Insert repayment_history snapshot (idempotent — ignore duplicate month)
        await trx('repayment_history')
          .insert({
            history_id: crypto.randomUUID(),
            credit_account_id: creditAccountId,
            reporting_month,
            months_in_arrears: payload.months_in_arrears,
            current_balance: parseInt(payload.current_balance as string, 10) || 0,
            instalment_amount: parseInt(payload.instalment_amount as string, 10) || 0,
            amount_overdue: parseInt(payload.amount_overdue as string, 10) || 0,
            payment_type: payload.payment_type,
            status_code: (payload.status_code as string)?.trim() || null,
            batch_id,
            created_at: new Date(),
          })
          .onConflict(['credit_account_id', 'reporting_month'])
          .ignore();

        // 7. Insert status event if status_code present
        const statusCode = (payload.status_code as string)?.trim();
        const statusDate = (payload.status_date as string)?.trim();
        if (statusCode && statusDate) {
          await trx('account_status_events').insert({
            event_id: crypto.randomUUID(),
            credit_account_id: creditAccountId,
            status_code: statusCode,
            status_date: statusDate,
            submitted_month: reporting_month,
            batch_id,
            created_at: new Date(),
          });
        }
      });
    }

    // Update mastering progress in Firestore atomically
    const masteringRef = firestore.doc(`batches/${batch_id}/mastering/progress`);
    await firestore.runTransaction(async (t) => {
      const doc = await t.get(masteringRef);
      const current = doc.exists
        ? (doc.data() as { completed_chunks: number; total_chunks: number })
        : { completed_chunks: 0, total_chunks: total_mastering_chunks };
      const newCompleted = current.completed_chunks + 1;
      t.set(masteringRef, {
        completed_chunks: newCompleted,
        total_chunks: total_mastering_chunks,
        updated_at: new Date(),
      });
    });

    // Check if all mastering chunks done
    const masteringDoc = await firestore.doc(`batches/${batch_id}/mastering/progress`).get();
    const masteringData = masteringDoc.data();
    if (masteringData && masteringData.completed_chunks >= masteringData.total_chunks) {
      // All mastering done — finalize
      const batch = await db('batch_uploads').where('batch_id', batch_id).first();
      await db('batch_uploads').where('batch_id', batch_id).update({
        status: 'COMPLETED',
        stage: 'COMPLETED',
        completed_at: new Date(),
      });

      const completeMsg: BatchCompleteMessage = {
        batch_id,
        institution_id,
        status: 'COMPLETED',
        accepted_count: batch.accepted_count,
        rejected_count: batch.rejected_count,
        warning_count: batch.warning_count,
      };
      await publishMessage(config.pubsub.batchCompleteTopic, completeMsg);
    }

    console.log(
      `Mastering chunk ${chunk_index}/${total_mastering_chunks} for batch ${batch_id}: processed ${rawRecords.length} records`,
    );
  },
);
