import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import { config } from './config';
import { publishMessage } from './pubsub';
import { getDb as getFirestoreDb } from './firestore';
import { getDb } from './db';
import type { ChunkValidateMessage } from './types';

export const fnParseBatch = onObjectFinalized(
  {
    bucket: config.gcsBucketBatches,
    memory: '1GiB',
    timeoutSeconds: 540,
    maxInstances: 1, // one parse per batch
  },
  async (event) => {
    const filePath = event.data.name; // e.g. 'batches/{batchId}/BW0001_ALL_L702_M_20260331_1_1.txt'
    if (!filePath || !filePath.startsWith('batches/')) return;

    const parts = filePath.split('/');
    const batchId = parts[1];

    if (!batchId) {
      console.error(`Cannot extract batchId from path: ${filePath}`);
      return;
    }

    const db = getDb();
    const firestore = getFirestoreDb();

    // 1. Load batch from postgres to get institution context
    const batch = await db('batch_uploads').where('batch_id', batchId).first();
    if (!batch) {
      console.error(`Batch ${batchId} not found in database`);
      return;
    }

    // 2. Update batch status to VALIDATING
    await db('batch_uploads').where('batch_id', batchId).update({
      status: 'VALIDATING',
      stage: 'PARSING',
      started_at: new Date(),
    });

    // 3. Download file from GCS
    const storage = getStorage();
    const bucket = storage.bucket(config.gcsBucketBatches);
    const file = bucket.file(filePath);
    const [fileContents] = await file.download();
    const lines = fileContents
      .toString('utf8')
      .split('\n')
      .filter((l) => l.trim().length > 0);

    if (lines.length < 3) {
      // File too short — no header/data/trailer
      await db('batch_uploads')
        .where('batch_id', batchId)
        .update({ status: 'FAILED', stage: 'HEADER_TRAILER' });
      return;
    }

    const headerLine = lines[0];
    const trailerLine = lines[lines.length - 1];
    const dataLines = lines.slice(1, -1);

    // 4. Basic header/trailer check (record type chars)
    if (headerLine[0] !== 'H') {
      await db('batch_uploads')
        .where('batch_id', batchId)
        .update({ status: 'FAILED', stage: 'HEADER_TRAILER' });
      // Insert file-level validation error
      await db('validation_errors').insert({
        error_id: crypto.randomUUID(),
        batch_id: batchId,
        code: 'HEADER_RECORD_COUNT_MISMATCH',
        severity: 'REJECT',
        message: 'File header record type is not H',
        error_category: 'FILE_LEVEL',
        created_at: new Date(),
      });
      return;
    }

    const trailerCount = parseInt(trailerLine.substring(1, 8).trim(), 10) || 0;
    const totalRecords = dataLines.length;

    // 5. Extract header metadata and update batch
    const headerSrn = headerLine.substring(1, 11).trim();
    const headerMonthEnd = headerLine.substring(11, 19).trim();
    const headerVersion = headerLine.substring(19, 21).trim();
    const headerCreationDate = headerLine.substring(21, 29).trim();

    await db('batch_uploads').where('batch_id', batchId).update({
      total_records: totalRecords,
      header_supplier_ref: headerSrn,
      header_month_end: headerMonthEnd,
      header_version: headerVersion,
      header_file_creation_date: headerCreationDate,
      trailer_record_count: trailerCount,
      stage: 'FIELD_VALIDATION',
    });

    // 6. Chunk data lines and publish to mfcb-chunk-validate
    const totalChunks = Math.ceil(totalRecords / config.chunkSize);

    // Initialize Firestore batch state
    await firestore.doc(`batches/${batchId}`).set({
      status: 'validating',
      total_chunks: totalChunks,
      completed_chunks: 0,
      failed_chunks: 0,
      total_records: totalRecords,
      accepted_count: 0,
      rejected_count: 0,
      warning_count: 0,
      updated_at: new Date(),
    });

    // Publish chunk messages
    for (let i = 0; i < totalChunks; i++) {
      const chunkRows = dataLines.slice(i * config.chunkSize, (i + 1) * config.chunkSize);
      const message: ChunkValidateMessage = {
        batch_id: batchId,
        institution_id: batch.institution_id,
        supplier_reference_number: batch.supplier_reference_number,
        reporting_month: batch.reporting_month,
        file_type: batch.file_type,
        chunk_index: i,
        total_chunks: totalChunks,
        rows: chunkRows,
        is_json: false,
      };
      await publishMessage(config.pubsub.chunkValidateTopic, message);
    }

    console.log(`Batch ${batchId}: parsed ${totalRecords} records into ${totalChunks} chunks`);
  },
);
