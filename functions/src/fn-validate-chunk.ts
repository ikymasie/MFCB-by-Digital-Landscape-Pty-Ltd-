import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { FieldValue } from 'firebase-admin/firestore';
import { validateRecord, parseRecord } from '@mfcb/validation';
import type { FormGRecord, BatchContext } from '@mfcb/validation';
import type { Knex } from 'knex';
import { config } from './config';
import { getDb } from './db';
import { getDb as getFirestoreDb } from './firestore';
import type { ChunkValidateMessage } from './types';

export const fnValidateChunk = onMessagePublished(
  {
    topic: config.pubsub.chunkValidateTopic,
    memory: '512MiB',
    timeoutSeconds: 300,
    maxInstances: 50,
    retry: true,
  },
  async (event) => {
    const message: ChunkValidateMessage = JSON.parse(
      Buffer.from(event.data.message.data, 'base64').toString(),
    );

    const {
      batch_id,
      chunk_index,
      total_chunks,
      rows,
      is_json,
      supplier_reference_number,
      reporting_month,
      file_type,
    } = message;

    const db = getDb();
    const firestore = getFirestoreDb();

    const ctx: BatchContext = {
      institution_supplier_ref: supplier_reference_number,
      reporting_month,
      file_type,
      account_keys_seen: new Set<string>(),
    };

    const reportingDate = parseReportingMonth(reporting_month);

    let accepted = 0;
    let rejected = 0;
    let warnings = 0;
    const rawRecordInserts: Record<string, unknown>[] = [];
    const errorInserts: Record<string, unknown>[] = [];

    // Process each row in the chunk
    const startRow = chunk_index * config.chunkSize + 1; // 1-based

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = startRow + i;
      const rawRecordId = crypto.randomUUID();

      let record: FormGRecord;
      let rawPayload: Record<string, unknown>;

      if (is_json) {
        record = JSON.parse(rows[i]) as FormGRecord;
        rawPayload = record as unknown as Record<string, unknown>;
      } else {
        record = parseRecord(rows[i], rowNumber);
        rawPayload = record as unknown as Record<string, unknown>;
      }

      // Validate
      const result = validateRecord(record, rowNumber, ctx, reportingDate);

      rawRecordInserts.push({
        raw_record_id: rawRecordId,
        batch_id,
        row_number: rowNumber,
        record_type: record.record_type || 'D',
        raw_payload: rawPayload,
        is_correction: false,
        created_at: new Date(),
      });

      if (result.is_valid) {
        accepted++;
      } else {
        rejected++;
      }

      // Collect errors
      for (const err of result.errors) {
        if (err.severity === 'WARN') warnings++;
        errorInserts.push({
          error_id: crypto.randomUUID(),
          batch_id,
          raw_record_id: rawRecordId,
          row_number: rowNumber,
          field: err.field ?? null,
          code: err.code,
          severity: err.severity,
          raw_value: err.raw_value ?? null,
          message: err.message,
          error_category: err.error_category,
          created_at: new Date(),
        });
      }
    }

    // Batch insert raw records and errors
    await db.transaction(async (trx: Knex.Transaction) => {
      if (rawRecordInserts.length > 0) {
        await trx('raw_submission_records').insert(rawRecordInserts);
      }
      if (errorInserts.length > 0) {
        await trx('validation_errors').insert(errorInserts);
      }
    });

    // Atomically update Firestore chunk counter
    const batchRef = firestore.doc(`batches/${batch_id}`);
    const chunkRef = firestore.doc(`batches/${batch_id}/chunks/${chunk_index}`);

    await firestore.runTransaction(async (t) => {
      t.set(chunkRef, {
        status: 'completed',
        accepted_count: accepted,
        rejected_count: rejected,
        warning_count: warnings,
        processed_at: new Date(),
      });
      t.update(batchRef, {
        completed_chunks: FieldValue.increment(1),
        accepted_count: FieldValue.increment(accepted),
        rejected_count: FieldValue.increment(rejected),
        warning_count: FieldValue.increment(warnings),
        updated_at: new Date(),
      });
    });

    console.log(
      `Chunk ${chunk_index}/${total_chunks} for batch ${batch_id}: ${accepted} accepted, ${rejected} rejected`,
    );
  },
);

function parseReportingMonth(ccyymmdd: string): Date {
  const year = parseInt(ccyymmdd.substring(0, 4), 10);
  const month = parseInt(ccyymmdd.substring(4, 6), 10) - 1;
  const day = parseInt(ccyymmdd.substring(6, 8), 10);
  return new Date(year, month, day);
}
